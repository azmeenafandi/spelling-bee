/**
 * D1-based per-IP, per-endpoint rate limiting.
 *
 * Each request is placed into a time window derived from
 * `RATE_LIMIT_WINDOW_SECONDS`.  The per-endpoint limit is read from
 * `RATE_LIMIT_${endpoint}`.
 *
 * Returns a 429 Response when the limit is exceeded, or null when the
 * request is allowed.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

interface RateLimitEnv {
	DB: D1Database;
	RATE_LIMIT_WINDOW_SECONDS: string;
	[key: string]: string;
}

export async function checkRateLimit(
	request: Request,
	env: RateLimitEnv,
	endpoint: string,
): Promise<Response | null> {
	const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
	const windowSeconds = parseInt(env.RATE_LIMIT_WINDOW_SECONDS, 10);
	const windowStart = Math.floor(Date.now() / (windowSeconds * 1000));
	const limit = parseInt(env[`RATE_LIMIT_${endpoint.toUpperCase()}`], 10);

	// If the env var is missing or not a valid number, skip rate limiting.
	if (isNaN(limit) || limit <= 0) {
		return null;
	}

	// Check existing row
	const row = await env.DB.prepare(
		'SELECT count FROM rate_limits WHERE ip = ? AND endpoint = ? AND window_start = ?',
	)
		.bind(ip, endpoint, windowStart)
		.first<{ count: number }>();

	if (row) {
		if (row.count >= limit) {
			const retryAfter = windowSeconds * 1000 - (Date.now() % (windowSeconds * 1000));
			return new Response(
				JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
				{
					status: 429,
					headers: {
						...JSON_HEADERS,
						'Retry-After': String(Math.ceil(retryAfter / 1000)),
					},
				},
			);
		}

		// Increment count
		await env.DB.prepare(
			'UPDATE rate_limits SET count = count + 1 WHERE ip = ? AND endpoint = ? AND window_start = ?',
		)
			.bind(ip, endpoint, windowStart)
			.run();
	} else {
		// Insert new row
		await env.DB.prepare(
			'INSERT INTO rate_limits (ip, endpoint, window_start, count) VALUES (?, ?, ?, 1)',
		)
			.bind(ip, endpoint, windowStart)
			.run();
	}

	return null;
}

/**
 * POST /api/check — Validate a player's spelling attempt.
 *
 * Body (JSON):
 *   id       — word ID (integer > 0, required)
 *   spelling — player's attempt (non-empty string, required)
 *   attempt  — 1 or 2 (required)
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async (context) => {
  try {
    // ── Parse JSON body ──
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Request body must be a JSON object' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    const { id, spelling, attempt } = body as Record<string, unknown>;

    // ── Validate fields ──
    if (id === undefined || spelling === undefined || attempt === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: id, spelling, attempt' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      return new Response(
        JSON.stringify({ error: 'id must be a positive integer' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (typeof spelling !== 'string' || spelling.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'spelling must be a non-empty string' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (attempt !== 1 && attempt !== 2) {
      return new Response(
        JSON.stringify({ error: 'attempt must be 1 or 2' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // ── Look up word ──
    const word = await context.env.DB.prepare('SELECT spelling FROM words WHERE id = ?')
      .bind(id)
      .first<{ spelling: string }>();

    if (!word) {
      return new Response(
        JSON.stringify({ error: 'Word not found' }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    // ── Case-insensitive comparison ──
    const isCorrect = spelling.trim().toLowerCase() === word.spelling.toLowerCase();

    if (isCorrect) {
      return new Response(
        JSON.stringify({ correct: true, game_over: false }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    // ── Wrong attempt ──
    if (attempt === 1) {
      return new Response(
        JSON.stringify({ correct: false, game_over: false }),
        { status: 200, headers: JSON_HEADERS }
      );
    }

    // attempt === 2 → game over, reveal answer
    return new Response(
      JSON.stringify({ correct: false, game_over: true, answer: word.spelling }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};

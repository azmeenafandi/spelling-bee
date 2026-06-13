/**
 * POST /api/report — Submit a word correction report.
 *
 * Body (JSON):
 *   word_id — ID of the word being reported (integer > 0, required)
 *   reason  — one of 'wrong_spelling' | 'wrong_definition' | 'wrong_variant' | 'other' (required)
 *   note    — optional free-text elaboration
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

const VALID_REASONS = ['wrong_spelling', 'wrong_definition', 'wrong_variant', 'other'] as const;
const VALID_REASONS_SET = new Set(VALID_REASONS);

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

    const { word_id, reason, note } = body as Record<string, unknown>;

    // ── Validate required fields ──
    if (word_id === undefined || reason === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: word_id, reason' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (typeof word_id !== 'number' || !Number.isInteger(word_id) || word_id <= 0) {
      return new Response(
        JSON.stringify({ error: 'word_id must be a positive integer' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (typeof reason !== 'string' || !VALID_REASONS_SET.has(reason as typeof VALID_REASONS[number])) {
      return new Response(
        JSON.stringify({
          error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`,
        }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // Validate optional note
    const noteValue =
      note === null || note === undefined
        ? null
        : typeof note === 'string'
          ? note.trim() || null
          : null;

    // ── Verify word exists ──
    const word = await context.env.DB.prepare('SELECT id FROM words WHERE id = ?')
      .bind(word_id)
      .first<{ id: number }>();

    if (!word) {
      return new Response(
        JSON.stringify({ error: 'Word not found' }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    // ── Insert report ──
    await context.env.DB.prepare('INSERT INTO reports (word_id, reason, note) VALUES (?, ?, ?)')
      .bind(word_id, reason, noteValue)
      .run();

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};

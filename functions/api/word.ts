/**
 * GET /api/word — Fetch a random word for the current game tier.
 *
 * Query params:
 *   variant     — 'british' | 'american' (required)
 *   length_min  — minimum word length (required, integer)
 *   length_max  — maximum word length (required, integer)
 *   max_obscurity — highest allowed obscurity 1–5 (required, integer)
 *   played_ids  — comma-separated word IDs to exclude (optional)
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const params = url.searchParams;

    // ── Parse required params ──
    const variant = params.get('variant');
    const lengthMinStr = params.get('length_min');
    const lengthMaxStr = params.get('length_max');
    const maxObscurityStr = params.get('max_obscurity');
    const playedIdsRaw = params.get('played_ids');

    // ── Validate presence ──
    if (
      variant === null ||
      lengthMinStr === null ||
      lengthMaxStr === null ||
      maxObscurityStr === null
    ) {
      return new Response(
        JSON.stringify({ error: 'Missing required query parameters: variant, length_min, length_max, max_obscurity' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // ── Validate variant ──
    if (variant !== 'british' && variant !== 'american') {
      return new Response(
        JSON.stringify({ error: 'variant must be "british" or "american"' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // ── Parse & validate integers ──
    const lengthMin = parseInt(lengthMinStr, 10);
    const lengthMax = parseInt(lengthMaxStr, 10);
    const maxObscurity = parseInt(maxObscurityStr, 10);

    if (isNaN(lengthMin) || isNaN(lengthMax) || isNaN(maxObscurity)) {
      return new Response(
        JSON.stringify({ error: 'length_min, length_max, and max_obscurity must be valid integers' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    if (lengthMin < 1 || lengthMax < 1 || maxObscurity < 1 || maxObscurity > 5) {
      return new Response(
        JSON.stringify({ error: 'length_min/length_max must be ≥ 1; max_obscurity must be between 1 and 5' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // ── Parse played_ids ──
    const playedIds: number[] = [];
    if (playedIdsRaw && playedIdsRaw.trim() !== '') {
      for (const part of playedIdsRaw.split(',')) {
        const id = parseInt(part.trim(), 10);
        if (isNaN(id)) {
          return new Response(
            JSON.stringify({ error: `Invalid played_id value: "${part.trim()}"` }),
            { status: 400, headers: JSON_HEADERS }
          );
        }
        playedIds.push(id);
      }
    }

    // ── Build parameterised query ──
    // Base query — we use positional ? placeholders and bind in order.
    let sql =
      'SELECT id, definition, spelling AS _spelling, obscurity AS _obscurity, length AS _length ' +
      'FROM words ' +
      'WHERE variant IN (?, \'both\') ' +
      'AND length >= ? ' +
      'AND length <= ? ' +
      'AND obscurity <= ?';

    const bindings: unknown[] = [variant, lengthMin, lengthMax, maxObscurity];

    // Dynamic NOT IN clause for played IDs
    if (playedIds.length > 0) {
      const placeholders = playedIds.map(() => '?').join(', ');
      sql += ` AND id NOT IN (${placeholders})`;
      for (const id of playedIds) {
        bindings.push(id);
      }
    }

    sql += ' ORDER BY RANDOM() LIMIT 1';

    // ── Execute ──
    const row = await context.env.DB.prepare(sql).bind(...bindings).first<{
      id: number;
      definition: string;
      _spelling: string;
      _obscurity: number;
      _length: number;
    }>();

    if (!row) {
      return new Response(
        JSON.stringify({ error: 'No words match the given criteria' }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    return new Response(
      JSON.stringify({
        id: row.id,
        definition: row.definition,
        _spelling: row._spelling,
        _obscurity: row._obscurity,
        _length: row._length,
      }),
      { status: 200, headers: JSON_HEADERS }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: JSON_HEADERS }
    );
  }
};

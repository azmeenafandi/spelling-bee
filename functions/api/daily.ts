/**
 * GET /api/daily — Fetch today's deterministic daily challenge word.
 *
 * Query params:
 *   variant — 'british' | 'american' (required)
 *
 * The word ID is derived from the date + variant via a simple numeric hash,
 * making it identical for all players on the same day.
 */

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const onRequestGet: PagesFunction<{ DB: D1Database }> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const params = url.searchParams;

    const variant = params.get('variant');

    if (variant !== 'british' && variant !== 'american') {
      return new Response(
        JSON.stringify({ error: 'variant must be "british" or "american"' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }

    // ── Deterministic date string (UTC) ──
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;

    // ── Simple numeric hash: sum of char codes mod count ──
    const seed = `${dateStr}-${variant}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash + seed.charCodeAt(i)) | 0;
    }
    // Ensure non-negative
    hash = Math.abs(hash);

    // ── Count eligible words ──
    const countRow = await context.env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM words WHERE variant IN (?, 'both')`
    )
      .bind(variant)
      .first<{ cnt: number }>();

    const wordCount = countRow?.cnt ?? 0;
    if (wordCount === 0) {
      return new Response(
        JSON.stringify({ error: 'No words available for this variant' }),
        { status: 404, headers: JSON_HEADERS }
      );
    }

    // ── Compute deterministic ID (1-indexed) ──
    const targetId = (hash % wordCount) + 1;

    // ── Fetch the word at that ordinal position ──
    // We need the Nth eligible word, ordered by id for stability.
    // Use a subquery with row number or offset approach.
    const row = await context.env.DB.prepare(
      `SELECT id, definition, spelling AS _spelling, obscurity AS _obscurity, length AS _length
       FROM words
       WHERE variant IN (?, 'both')
       ORDER BY id ASC
       LIMIT 1 OFFSET ?`
    )
      .bind(variant, targetId - 1)
      .first<{
        id: number;
        definition: string;
        _spelling: string;
        _obscurity: number;
        _length: number;
      }>();

    if (!row) {
      return new Response(
        JSON.stringify({ error: 'Could not find daily word' }),
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
        date: dateStr,
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

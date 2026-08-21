/**
 * POST /api/report — Submit a word correction report.
 *
 * Body (JSON):
 *   word_id — ID of the word being reported (integer > 0, required)
 *   reason  — one of 'wrong_spelling' | 'wrong_definition' | 'wrong_variant' | 'other' (required)
 *   note    — optional free-text elaboration
 */

import { checkRateLimit } from '../../src/lib/rate-limit';
import { getCorsHeaders, handleOptions } from '../../src/lib/cors';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

const VALID_REASONS = ['wrong_spelling', 'wrong_definition', 'wrong_variant', 'other'] as const;
const VALID_REASONS_SET = new Set(VALID_REASONS);

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async (context) => {
  try {
    const optionsResponse = handleOptions(context.request);
    if (optionsResponse) return optionsResponse;
    const corsHeaders = getCorsHeaders(context.request);
    // ── Rate limit check ──
    const rateLimitResponse = await checkRateLimit(context.request, context.env, 'REPORT');
    if (rateLimitResponse) return rateLimitResponse;

    // ── Parse JSON body ──
    let body: unknown;
    try {
      body = await context.request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    if (!body || typeof body !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Request body must be a JSON object' }),
        { status: 400, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    const { word_id, reason, note } = body as Record<string, unknown>;

    // ── Validate required fields ──
    if (word_id === undefined || reason === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: word_id, reason' }),
        { status: 400, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    if (typeof word_id !== 'number' || !Number.isInteger(word_id) || word_id <= 0) {
      return new Response(
        JSON.stringify({ error: 'word_id must be a positive integer' }),
        { status: 400, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    if (typeof reason !== 'string' || !VALID_REASONS_SET.has(reason as typeof VALID_REASONS[number])) {
      return new Response(
        JSON.stringify({
          error: `Invalid reason. Must be one of: ${VALID_REASONS.join(', ')}`,
        }),
        { status: 400, headers: { ...JSON_HEADERS, ...corsHeaders } }
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
        { status: 404, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    // ── Insert report ──
    await context.env.DB.prepare('INSERT INTO reports (word_id, reason, note) VALUES (?, ?, ?)')
      .bind(word_id, reason, noteValue)
      .run();

    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { ...JSON_HEADERS, ...corsHeaders } }
    );
  } catch (err) {
    const corsHeaders = getCorsHeaders(context.request);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...JSON_HEADERS, ...corsHeaders } }
    );
  }
};

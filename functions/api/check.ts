/**
 * POST /api/check — Validate a player's spelling attempt.
 *
 * Body (JSON):
 *   id       — word ID (integer > 0, required)
 *   spelling — player's attempt (non-empty string, required)
 *   attempt  — 1 or 2 (required)
 */

import { checkRateLimit } from '../../src/lib/rate-limit';
import { getCorsHeaders, handleOptions } from '../../src/lib/cors';

const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const onRequestPost: PagesFunction<{ DB: D1Database }> = async (context) => {
  try {
    const optionsResponse = handleOptions(context.request);
    if (optionsResponse) return optionsResponse;
    const corsHeaders = getCorsHeaders(context.request);
    const rateLimitResponse = await checkRateLimit(context.request, context.env, 'CHECK');
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

    const { id, spelling, attempt } = body as Record<string, unknown>;

    // ── Validate fields ──
    if (id === undefined || spelling === undefined || attempt === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: id, spelling, attempt' }),
        { status: 400, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
      return new Response(
        JSON.stringify({ error: 'id must be a positive integer' }),
        { status: 400, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    if (typeof spelling !== 'string' || spelling.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'spelling must be a non-empty string' }),
        { status: 400, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    if (attempt !== 1 && attempt !== 2) {
      return new Response(
        JSON.stringify({ error: 'attempt must be 1 or 2' }),
        { status: 400, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    // ── Look up word ──
    const word = await context.env.DB.prepare('SELECT spelling FROM words WHERE id = ?')
      .bind(id)
      .first<{ spelling: string }>();

    if (!word) {
      return new Response(
        JSON.stringify({ error: 'Word not found' }),
        { status: 404, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    // ── Case-insensitive comparison ──
    const isCorrect = spelling.trim().toLowerCase() === word.spelling.toLowerCase();

    if (isCorrect) {
      return new Response(
        JSON.stringify({ correct: true, game_over: false }),
        { status: 200, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    // ── Wrong attempt ──
    if (attempt === 1) {
      return new Response(
        JSON.stringify({ correct: false, game_over: false }),
        { status: 200, headers: { ...JSON_HEADERS, ...corsHeaders } }
      );
    }

    // attempt === 2 → game over
    return new Response(
      JSON.stringify({ correct: false, game_over: true }),
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

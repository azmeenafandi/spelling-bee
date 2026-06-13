/**
 * GET /api/word — Fetch a random word for the current game tier.
 * Phase 1 stub: returns hardcoded JSON.
 * Phase 2 will implement real D1 queries with filtering.
 */
export const onRequestGet: PagesFunction = async (context) => {
  // Stub: return a placeholder word
  return new Response(
    JSON.stringify({
      id: 1,
      definition: 'A natural elevation of the earth\'s surface',
      _spelling: 'mountain'
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

/**
 * POST /api/check — Validate a player's spelling attempt.
 * Phase 1 stub: returns hardcoded JSON.
 * Phase 2 will implement real D1 lookup and comparison.
 */
export const onRequestPost: PagesFunction = async (context) => {
  // Stub: always return "correct, not game over"
  return new Response(
    JSON.stringify({
      correct: true,
      game_over: false
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

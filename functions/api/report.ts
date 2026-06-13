/**
 * POST /api/report — Submit a word correction report.
 * Phase 1 stub: returns hardcoded success.
 * Phase 2 will implement real D1 insert into reports table.
 */
export const onRequestPost: PagesFunction = async (context) => {
  // Stub: always return success
  return new Response(
    JSON.stringify({
      ok: true
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

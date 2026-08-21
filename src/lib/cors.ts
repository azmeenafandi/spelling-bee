const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

/**
 * Get CORS headers for a request. Returns headers if origin matches host, empty object otherwise.
 */
export function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (!origin) return {};

  const host = request.headers.get('Host');
  if (!host) return {};

  // Check if origin hostname matches or is a subdomain of the request host
  try {
    const originHostname = new URL(origin).hostname;
    const requestHostname = host.split(':')[0]; // strip port

    if (originHostname === requestHostname || originHostname.endsWith('.' + requestHostname)) {
      return { 'Access-Control-Allow-Origin': origin };
    }
  } catch {
    // Invalid origin URL — block
  }

  return {};
}

/**
 * Handle CORS preflight (OPTIONS) request. Returns a Response if it's a preflight, null otherwise.
 */
export function handleOptions(request: Request): Response | null {
  if (request.method !== 'OPTIONS') return null;

  const corsHeaders = getCorsHeaders(request);
  if (!corsHeaders['Access-Control-Allow-Origin']) {
    return new Response(null, { status: 403 });
  }

  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders,
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

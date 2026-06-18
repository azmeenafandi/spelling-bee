/**
 * Typed fetch wrappers for the Spelling Bee API.
 *
 * All endpoints are relative to the Pages origin (/api/...).
 * Every function throws on non-OK HTTP status.
 */

/* ------------------------------------------------------------------
   Response types
   ------------------------------------------------------------------ */

export interface WordResponse {
  id: number;
  definition: string;
  _spelling: string;
  _obscurity: number;
  _length: number;
}

export interface CheckResponse {
  correct: boolean;
  game_over: boolean;
  answer?: string;
}

export interface ReportResponse {
  ok: boolean;
}

/* ------------------------------------------------------------------
   Helpers
   ------------------------------------------------------------------ */

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const msg = (body as Record<string, unknown> | null)?.error ?? res.statusText;
    throw new Error(typeof msg === 'string' ? msg : `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ------------------------------------------------------------------
   Endpoint functions
   ------------------------------------------------------------------ */

export async function fetchWord(params: {
  variant: string;
  length_min: number;
  length_max: number;
  max_obscurity: number;
  played_ids: string;
}): Promise<WordResponse> {
  const qs = new URLSearchParams({
    variant: params.variant,
    length_min: String(params.length_min),
    length_max: String(params.length_max),
    max_obscurity: String(params.max_obscurity),
    played_ids: params.played_ids,
  });
  return request<WordResponse>(`/api/word?${qs}`);
}

export async function checkSpelling(body: {
  id: number;
  spelling: string;
  attempt: number;
}): Promise<CheckResponse> {
  return request<CheckResponse>('/api/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function reportIssue(body: {
  word_id: number;
  reason: string;
  note?: string;
}): Promise<ReportResponse> {
  return request<ReportResponse>('/api/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export interface DailyResponse extends WordResponse {
  date: string;
}

export async function fetchDaily(
  variant: string
): Promise<DailyResponse> {
  const qs = new URLSearchParams({ variant });
  return request<DailyResponse>(`/api/daily?${qs}`);
}

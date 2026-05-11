/**
 * Thin fetch wrapper for internal CRM API calls.
 *
 * Automatically attaches the x-crm-secret header when CRM_API_SECRET is
 * configured, so individual call sites don't repeat the header logic.
 *
 * Usage — drop-in replacement for fetch():
 *   const res = await apiFetch("/api/contacts");
 *   const res = await apiFetch("/api/deals", { method: "POST", body: JSON.stringify(data) });
 *
 * Only for internal /api/* calls. Never use this for external URLs (Resend,
 * third-party webhooks, etc.) — those have their own auth mechanisms.
 */
export function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const secret = process.env.NEXT_PUBLIC_CRM_API_SECRET;

  const headers = new Headers(init.headers);
  if (secret) {
    headers.set("x-crm-secret", secret);
  }

  return fetch(input, { ...init, headers });
}

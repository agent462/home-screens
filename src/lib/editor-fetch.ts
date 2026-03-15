/**
 * Centralized fetch wrapper for all editor API calls.
 * Intercepts 401 responses and redirects to the login page.
 * Must be used instead of raw fetch() in all editor components.
 */
export async function editorFetch(url: string, options?: RequestInit): Promise<Response> {
  const res = await fetch(url, options);
  if (res.status === 401) {
    const from = window.location.pathname + window.location.search;
    window.location.href = `/login?from=${encodeURIComponent(from)}`;
    throw new Error('Session expired');
  }
  return res;
}

/**
 * Thin fetch wrapper for the NUASA API server.
 *
 * API base URL resolution priority:
 *  1. window.__NUASA_API_URL__ — set in /public/config.js at runtime (edit on GO54)
 *  2. VITE_API_URL             — baked in at build time
 *  3. "/api"                   — same-origin relative (local dev, same-domain production)
 */
declare global {
  interface Window { __NUASA_API_URL__?: string }
}

export function getApiBase(): string {
  const configured =
    (typeof window !== "undefined" && window.__NUASA_API_URL__) ||
    import.meta.env.VITE_API_URL ||
    "/api";

  // Keep concatenated endpoint paths predictable when the runtime config is
  // edited for a separately hosted static frontend.
  return configured.replace(/\/+$/, "");
}

const TOKEN_KEY = "nuasa_local_access_token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken();
  const API_BASE = getApiBase();

  const headers = new Headers(options.headers);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    options.body &&
    !(options.body instanceof FormData) &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

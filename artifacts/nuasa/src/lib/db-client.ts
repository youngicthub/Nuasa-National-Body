// See src/lib/api.ts for why this is configurable rather than hardcoded.
import { getApiBase } from "@/lib/api";
const API_BASE = getApiBase();
const TOKEN_KEY = "nuasa_local_access_token";
async function request(path: string, init?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || `Request failed (${response.status})`;
    const error = new Error(message);
    throw error;
  }
  return payload;
}

function queryString(filters: Record<string, unknown>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value));
  });
  return params.toString();
}

function tableQuery(table: string) {
  const filters: Record<string, unknown> = {};
  let select = "*";
  let mode: "many" | "single" | "maybeSingle" = "many";
  let ordering = "";
  let limitValue: number | undefined;
  let countMode = false;
  const builder: any = {
    select(columns = "*", options?: { count?: string; head?: boolean }) {
      select = typeof columns === "string" ? columns : "*";
      countMode = Boolean(options?.count || options?.head);
      if (options?.head) mode = "many";
      return builder;
    },
    eq(column: string, value: unknown) { filters[column] = value; return builder; },
    gte(column: string, value: unknown) { filters[`gte.${column}`] = value; return builder; },
    lte(column: string, value: unknown) { filters[`lte.${column}`] = value; return builder; },
    lt(column: string, value: unknown) { filters[`lt.${column}`] = value; return builder; },
    in(column: string, values: unknown[]) { filters[`in.${column}`] = values.join(","); return builder; },
    not(column: string, operator: string, value: unknown) { filters[`not.${column}`] = `${operator}:${value ?? ""}`; return builder; },
    order(column: string, options?: { ascending?: boolean }) {
      ordering = `${column}.${options?.ascending === false ? "desc" : "asc"}`; return builder;
    },
    limit(value: number) { limitValue = value; return builder; },
    single() { mode = "single"; return builder; },
    maybeSingle() { mode = "maybeSingle"; return builder; },
    insert(body: unknown) {
      return request(`/data/${table}`, { method: "POST", body: JSON.stringify(body) })
        .then((payload) => ({ data: payload.data, error: null }));
    },
    upsert(body: unknown) {
      return request(`/data/${table}?upsert=true`, { method: "POST", body: JSON.stringify(body) })
        .then((payload) => ({ data: payload.data, error: null }));
    },
    update(body: unknown) {
      return {
        eq(column: string, value: unknown) {
          return request(`/data/${table}?${queryString({ ...filters, [column]: value })}`, {
            method: "PATCH", body: JSON.stringify(body),
          }).then((payload) => ({ data: payload.data, error: null }));
        },
      };
    },
    delete() {
      return {
        eq(column: string, value: unknown) {
          return request(`/data/${table}?${queryString({ ...filters, [column]: value })}`, { method: "DELETE" })
            .then((payload) => ({ data: payload.data, error: null }));
        },
        lt(column: string, value: unknown) {
          return request(`/data/${table}?${queryString({ ...filters, [column]: value })}`, { method: "DELETE" })
            .then((payload) => ({ data: payload.data, error: null }));
        },
        not(column: string, _operator: string, value: unknown) {
          return request(`/data/${table}?${queryString({ ...filters, [column]: value })}`, { method: "DELETE" })
            .then((payload) => ({ data: payload.data, error: null }));
        },
      };
    },
    then(resolve: (value: any) => unknown, reject?: (reason: unknown) => unknown) {
      const params = queryString({ select, ...filters, order: ordering || undefined, limit: limitValue, single: mode === "single", maybeSingle: mode === "maybeSingle", head: countMode });
      return request(`/data/${table}?${params}`)
        .then((payload) => ({ data: payload.data, count: payload.count ?? null, error: null }))
        .then(resolve, reject);
    },
  };
  return builder;
}

/**
 * Database-backed API client.
 *
 * Authentication is handled by the Express API's JWT endpoints in
 * `src/lib/auth.ts`; these methods only provide the existing
 * data/storage/function transport used by the UI.
 */
export const dbClient = {
  from: (table: string) => tableQuery(table),
  storage: {
    from: (bucket: string) => ({
      async upload(_path: string, file: File) {
        const form = new FormData();
        form.append("file", file);
        try {
          const payload = await request("/uploads", { method: "POST", body: form });
          return { data: { path: `${bucket}/${payload.path}` }, error: null };
        } catch (error) { return { data: null, error: error as Error }; }
      },
      getPublicUrl(filePath: string) {
        return { data: { publicUrl: `${API_BASE}/uploads/${filePath.split("/").pop()}` } };
      },
      async remove() { return { data: null, error: null }; },
    }),
  },
  functions: {
    async invoke(name: string, options?: { body?: unknown }) {
      try { return { data: (await request(`/functions/${name}`, { method: "POST", body: JSON.stringify(options?.body || {}) })).data, error: null }; }
      catch (error) { return { data: null, error: error as Error }; }
    },
  },
};
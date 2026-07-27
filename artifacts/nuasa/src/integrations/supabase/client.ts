type LocalUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type Session = { access_token: string; user: LocalUser };
export type User = LocalUser;

const API_BASE = "/api";
const TOKEN_KEY = "nuasa_local_access_token";
const listeners = new Set<(event: string, session: Session | null) => void>();

async function request(path: string, init?: RequestInit) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init?.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || payload?.error || `Request failed (${response.status})`);
  return payload;
}

function emit(event: string, session: Session | null) {
  listeners.forEach((listener) => listener(event, session));
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

export const supabase = {
  from: (table: string) => tableQuery(table),
  auth: {
    async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown> } }) {
      try {
        const payload = await request("/auth/signup", { method: "POST", body: JSON.stringify({ email, password, metadata: options?.data }) });
        if (payload.session?.access_token) {
          localStorage.setItem(TOKEN_KEY, payload.session.access_token);
          emit("SIGNED_IN", payload.session);
        }
        return { data: payload, error: null };
      } catch (error) { return { data: { user: null, session: null }, error: error as Error }; }
    },
    async signInWithPassword({ email, password }: { email: string; password: string }) {
      try {
        const payload = await request("/auth/signin", { method: "POST", body: JSON.stringify({ email, password }) });
        localStorage.setItem(TOKEN_KEY, payload.session.access_token);
        emit("SIGNED_IN", payload.session);
        return { data: payload, error: null };
      } catch (error) { return { data: { user: null, session: null }, error: error as Error }; }
    },
    async getSession() {
      try {
        const payload = await request("/auth/session");
        return { data: { session: payload.session as Session | null }, error: null };
      } catch { return { data: { session: null }, error: null }; }
    },
    async getUser() {
      const { data } = await this.getSession();
      return { data: { user: data.session?.user || null }, error: null };
    },
    async signOut() {
      localStorage.removeItem(TOKEN_KEY);
      emit("SIGNED_OUT", null);
      return { error: null };
    },
    onAuthStateChange(callback: (event: string, session: Session | null) => void) {
      listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => listeners.delete(callback) } } };
    },
    async updateUser({ password }: { password: string }) {
      try {
        await request("/auth/password", { method: "POST", body: JSON.stringify({ password }) });
        return { error: null };
      } catch (error) { return { error: error as Error }; }
    },
    async resetPasswordForEmail(email: string) {
      try {
        await request("/auth/reset-password", { method: "POST", body: JSON.stringify({ email }) });
        return { error: null };
      } catch (error) { return { error: error as Error }; }
    },
  },
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
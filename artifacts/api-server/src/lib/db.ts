import { Pool } from "pg";

// Strip channel_binding which node-postgres doesn't support
const connStr = (process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || "").replace(/[?&]channel_binding=[^&]*/g, (m) =>
  m.startsWith("?") ? "?" : ""
);

export const pool = new Pool({
  connectionString: connStr || undefined,
  // Fallback to individual env vars if NEON_DATABASE_URL is not set
  ...(connStr ? {} : {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "nuasa_database",
    user: process.env.DB_USER || "nuasa_user",
    password: process.env.DB_PASSWORD || "",
  }),
  ssl: connStr ? { rejectUnauthorized: false } : false,
  max: Number(process.env.DB_CONNECTION_LIMIT || 10),
});

const tableColumnsCache = new Map<string, Promise<Set<string>>>();

export async function getTableColumns(table: string): Promise<Set<string>> {
  const cached = tableColumnsCache.get(table);
  if (cached) return cached;
  const pending = pool
    .query(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [table],
    )
    .then((result) => new Set(result.rows.map((row) => String(row.column_name))));
  tableColumnsCache.set(table, pending);
  return pending;
}

// The imported project used the newer names below, while the existing Neon
// database still contains the original Supabase names. Keep the frontend
// contract stable and translate only at the database boundary.
const COLUMN_ALIASES: Record<string, Record<string, string>> = {
  blog_posts: { cover_image: "cover_image_url", view_count: "views" },
  library_resources: { cover_image: "cover_image_url" },
  events: { start_time: "event_date", cover_image: "image_url", is_published: "is_featured" },
  executives: { full_name: "name", sort_order: "display_order", is_active: "is_current" },
};

export function resolveColumn(table: string, column: string, columns: Set<string>): string | null {
  if (columns.has(column)) return column;
  const alias = COLUMN_ALIASES[table]?.[column];
  return alias && columns.has(alias) ? alias : null;
}

export function normalizeDbRow(table: string, raw: any): any {
  if (!raw || typeof raw !== "object") return raw;
  const row = { ...raw };
  const aliases = COLUMN_ALIASES[table] || {};
  for (const [canonical, actual] of Object.entries(aliases)) {
    if (row[canonical] === undefined && row[actual] !== undefined) {
      row[canonical] = row[actual];
    }
  }
  if (table === "library_resources") {
    if (row.file_name === undefined && typeof row.file_url === "string") {
      row.file_name = row.file_url.split("/").pop() || null;
    }
    if (row.is_public === undefined && row.access_level !== undefined) {
      row.is_public = String(row.access_level).toLowerCase() === "public";
    }
  }
  if (table === "blog_posts" && row.read_time === undefined) {
    row.read_time = 5;
  }
  return row;
}

export function normalizeDbInput(table: string, input: Record<string, unknown>, columns: Set<string>) {
  const output: Record<string, unknown> = {};
  for (const [canonical, value] of Object.entries(input)) {
    const actual = resolveColumn(table, canonical, columns);
    if (!actual) continue;
    let normalized = value;
    if (table === "library_resources" && canonical === "is_public" && columns.has("access_level")) {
      normalized = value ? "public" : "private";
    }
    output[actual] = normalized;
  }
  return output;
}

export async function deleteUserData(
  tx: { query: <R = unknown[]>(sql: string, params?: unknown[]) => Promise<R> },
  userId: string,
) {
  // Keep public content, but remove the deleted account's attribution where
  // the active database schema supports it.
  const blogColumns = await getTableColumns("blog_posts");
  if (blogColumns.has("author_id")) {
    await tx.query("UPDATE blog_posts SET author_id = NULL WHERE author_id = ?", [userId]);
  }
  const resourceColumns = await getTableColumns("library_resources");
  if (resourceColumns.has("author_id")) {
    await tx.query("UPDATE library_resources SET author_id = NULL WHERE author_id = ?", [userId]);
  }

  const dependentTables = [
    "auth_tokens",
    "saved_posts",
    "saved_resources",
    "post_views",
    "resource_views",
    "resource_downloads",
    "convention_registrations",
    "admin_login_log",
    "user_roles",
    "profiles",
  ] as const;
  for (const table of dependentTables) {
    const columns = await getTableColumns(table);
    if (columns.has("user_id")) {
      await tx.query(`DELETE FROM "${table}" WHERE user_id = ?`, [userId]);
    }
  }
  await tx.query("DELETE FROM users WHERE id = ?", [userId]);
}

// Prevent unhandled 'error' events on idle clients from crashing the process.
// pg emits these when the local PostgreSQL restarts or drops a connection.
pool.on("error", (err) => {
  console.error("[db] idle client error (pool will reconnect):", err.message);
});

function toPostgresPlaceholders(sql: string) {
  let idx = 0;
  return sql.replace(/\?/g, () => `$${++idx}`);
}

/**
 * Run a SQL query against the PostgreSQL database.
 * Converts MySQL-style `?` placeholders to PostgreSQL `$1, $2, ...` automatically.
 */
export async function query<T = unknown[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const result = await pool.query(toPostgresPlaceholders(sql), params);
  return result.rows as T;
}

/**
 * Run several statements as one all-or-nothing operation.
 * The callback receives a checked-out client and uses the same `?` placeholder
 * convention as `query`, so route code cannot accidentally escape the transaction.
 */
export async function withTransaction<T>(
  callback: (tx: { query: <R = unknown[]>(sql: string, params?: unknown[]) => Promise<R> }) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  const tx = {
    query: async <R = unknown[]>(sql: string, params: unknown[] = []) => {
      const result = await client.query(toPostgresPlaceholders(sql), params);
      return result.rows as R;
    },
  };
  try {
    await client.query("BEGIN");
    const result = await callback(tx);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

export async function closeDatabase() {
  await pool.end();
}

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

/**
 * Run a SQL query against the PostgreSQL database.
 * Converts MySQL-style `?` placeholders to PostgreSQL `$1, $2, ...` automatically.
 */
export async function query<T = unknown[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  // Convert MySQL-style ? to PostgreSQL $1, $2, ...
  let idx = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
  const result = await pool.query(pgSql, params);
  return result.rows as T;
}

export async function closeDatabase() {
  await pool.end();
}

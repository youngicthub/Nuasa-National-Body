import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: Number(process.env.DB_CONNECTION_LIMIT || 10),
});

/**
 * Run a SQL query against the PostgreSQL (Neon) database.
 * Accepts MySQL-style `?` placeholders and rewrites them to
 * PostgreSQL-style `$1`, `$2`, … so route files don't need editing.
 */
export async function query<T = unknown[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  let idx = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
  const result = await pool.query(pgSql, params);
  return result.rows as T;
}

export async function closeDatabase() {
  await pool.end();
}

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

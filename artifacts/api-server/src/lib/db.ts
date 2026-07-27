import mysql from "mysql2/promise";

const port = Number(process.env.DB_PORT || 3306);

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number.isFinite(port) ? port : 3306,
  database: process.env.DB_NAME || "nuasa_database",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  charset: "utf8mb4",
  namedPlaceholders: false,
});

export async function query<T = unknown[]>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [rows] = await pool.execute(sql, params);
  return rows as T;
}

export async function closeDatabase() {
  await pool.end();
}

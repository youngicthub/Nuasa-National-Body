import mysql from "mysql2/promise";

const MYSQL_SOCK = "/home/runner/.mysql-run/mysqld.sock";

export const pool = mysql.createPool({
  socketPath: MYSQL_SOCK,
  database: process.env.DB_NAME || "nuasa_database",
  user: process.env.DB_USER || "nuasa_user",
  password: process.env.DB_PASSWORD || "",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
});

/**
 * Run a SQL query against the MySQL database.
 * Uses native `?` placeholders (mysql2 style).
 */
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

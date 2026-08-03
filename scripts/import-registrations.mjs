/**
 * import-registrations.mjs
 * Imports convention registrations from the Excel export into MySQL.
 * - Creates a user account (email + bcrypt("123456")) for each unique email
 * - Creates profile, user_role records
 * - Creates convention_registration record
 * Run: node scripts/import-registrations.mjs
 */
import { createPool } from "mysql2/promise";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const XLSX = (await import("xlsx")).default;
const bcrypt = (await import("bcryptjs")).default;

const __dir = dirname(fileURLToPath(import.meta.url));
const XLSX_PATH = join(__dir, "../attached_assets/all-registrations-1785737380641_1785740210158.xlsx");
const MYSQL_SOCK = "/home/runner/.mysql-run/mysqld.sock";
const DEFAULT_PASSWORD = "123456";
const DB_NAME = process.env.DB_NAME || "nuasa_database";
const DB_USER = process.env.DB_USER || "nuasa_user";
const DB_PASSWORD = process.env.DB_PASSWORD || "";

const pool = createPool({
  socketPath: MYSQL_SOCK,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 5,
});

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : createHash("sha256").update(Math.random().toString()).digest("hex").slice(0, 36);
}

function norm(v) {
  return typeof v === "string" ? v.trim() : (v ?? null);
}

async function main() {
  const wb = XLSX.readFile(XLSX_PATH);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws);
  console.log(`Loaded ${rows.length} rows from Excel`);

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
  console.log("Password hash generated");

  // Deduplicate: keep most recent row per email
  const byEmail = new Map();
  for (const row of rows) {
    const email = norm(row["Email"])?.toLowerCase();
    if (!email) continue;
    if (!byEmail.has(email)) byEmail.set(email, row);
  }
  console.log(`Unique emails: ${byEmail.size}`);

  let usersCreated = 0, usersSkipped = 0, regsCreated = 0, regsSkipped = 0;

  for (const [email, row] of byEmail) {
    const fullName = norm(row["Name"]) || email;

    // 1. Create user (skip if exists)
    const [existingUsers] = await pool.execute(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    let userId;
    if (existingUsers.length > 0) {
      userId = existingUsers[0].id;
      usersSkipped++;
    } else {
      userId = uuid();
      await pool.execute(
        "INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at) VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        [userId, email, passwordHash]
      );
      // Profile
      const profileId = uuid();
      await pool.execute(
        "INSERT INTO profiles (id, user_id, full_name, email, institution, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        [profileId, userId, fullName, email, norm(row["Institution"])]
      );
      // Role
      await pool.execute(
        "INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, 'user', CURRENT_TIMESTAMP)",
        [uuid(), userId]
      );
      usersCreated++;
    }
  }

  console.log(`Users: ${usersCreated} created, ${usersSkipped} already existed`);

  // Now insert all 110 convention_registration rows (by Registration ID)
  for (const row of rows) {
    const email = norm(row["Email"])?.toLowerCase();
    if (!email) continue;

    // Look up user_id
    const [userRows] = await pool.execute("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (!userRows.length) { console.warn(`No user for email ${email}`); continue; }
    const userId = userRows[0].id;

    const regId = norm(row["Registration ID"]) || uuid();
    const txRef = norm(row["Flutterwave TX"]) || `IMPORT-${regId}`;
    const refCode = norm(row["Reference"]) || `NUASA-IMPORT-${regId.slice(0, 8).toUpperCase()}`;

    // Skip if already exists
    const [existing] = await pool.execute(
      "SELECT id FROM convention_registrations WHERE id = ? LIMIT 1",
      [regId]
    );
    if (existing.length > 0) { regsSkipped++; continue; }

    const amount = parseFloat(row["Amount (NGN)"]) || 0;
    const paymentStatus = norm(row["Payment Status"]) || "pending";
    const regType = norm(row["Type"]) || "student";
    const gradYear = row["Graduation Year"] ? parseInt(row["Graduation Year"]) : null;
    const dateStr = norm(row["Date"]);
    const createdAt = dateStr ? new Date(dateStr).toISOString().slice(0, 19).replace("T", " ") : null;

    await pool.execute(
      `INSERT INTO convention_registrations
        (id, user_id, registration_type, full_name, email, phone,
         institution, chapter_name, delegates_count, amount, currency,
         payment_status, tx_ref, flw_transaction_id, reference_code,
         gender, department, matric_number, graduation_year,
         accommodation_request, emergency_contact_name, emergency_contact_phone,
         created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'NGN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        regId, userId, regType,
        norm(row["Name"]), email, norm(row["Phone"]),
        norm(row["Institution"]), norm(row["Chapter"]) || null,
        parseInt(row["Delegates"]) || 1,
        amount, paymentStatus,
        txRef,
        norm(row["Flutterwave TX"]) || null,
        refCode,
        norm(row["Gender"]),
        norm(row["Department"]),
        norm(row["Matric Number"]),
        gradYear,
        norm(row["Accommodation"]),
        norm(row["Emergency Contact"]),
        norm(row["Emergency Phone"]),
        createdAt,
      ]
    );
    regsCreated++;
  }

  console.log(`Convention registrations: ${regsCreated} created, ${regsSkipped} already existed`);
  await pool.end();
  console.log("Done.");
}

main().catch(err => { console.error(err); process.exit(1); });

/**
 * Import CSV registrations into Neon convention_registrations table.
 * - Deduplicates by email: keeps best entry per email
 *   (successful > failed+TX > pending > no TX)
 * - Marks failed registrations that have a Flutterwave TX as 'successful'
 * - Skips entries whose ID already exists in the DB
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const CSV_PATH = path.resolve("attached_assets/all-registrations-1785880015950_1785883324012.csv");
const CONN = process.env.NEON_DATABASE_URL;
if (!CONN) throw new Error("NEON_DATABASE_URL not set");

const { Pool } = pg;
const pool = new Pool({ connectionString: CONN, ssl: { rejectUnauthorized: false } });

// ── Parse CSV ────────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.trim().split("\n");
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const cols = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h.trim(), (cols[i] || "").trim()]));
  });
}

function parseLine(line) {
  const cols = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuote && line[i+1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (c === ',' && !inQuote) {
      cols.push(cur); cur = "";
    } else {
      cur += c;
    }
  }
  cols.push(cur);
  return cols;
}

// ── Deduplication priority ───────────────────────────────────────────────────
function priority(row) {
  const tx = row["Flutterwave TX"];
  const status = row["Payment Status"];
  if (status === "successful" && tx) return 4;
  if (status === "successful") return 3;
  if (status === "failed" && tx) return 2;  // payment went through
  if (status === "pending" && tx) return 1;
  return 0;
}

function resolveStatus(row) {
  // Failed registrations with a TX reference = payment went through → successful
  if (row["Payment Status"] === "failed" && row["Flutterwave TX"]) return "successful";
  return row["Payment Status"] === "pending" ? "pending" : row["Payment Status"];
}

// ── Main ─────────────────────────────────────────────────────────────────────
const text = fs.readFileSync(CSV_PATH, "utf8");
const rows = parseCSV(text);
console.log(`Parsed ${rows.length} CSV rows`);

// Deduplicate: keep best entry per email
const byEmail = new Map();
for (const row of rows) {
  const email = row["Email"].toLowerCase();
  const existing = byEmail.get(email);
  if (!existing || priority(row) > priority(existing)) {
    byEmail.set(email, row);
  } else if (priority(row) === priority(existing)) {
    // Same priority → keep more recent
    const a = new Date(row["Date"]);
    const b = new Date(existing["Date"]);
    if (a > b) byEmail.set(email, row);
  }
}
const deduped = [...byEmail.values()];
console.log(`After deduplication: ${deduped.length} unique registrations`);

// Fetch existing IDs from DB to skip duplicates
const existing = await pool.query("SELECT id FROM convention_registrations");
const existingIds = new Set(existing.rows.map(r => r.id));
console.log(`Already in DB: ${existingIds.size} registrations`);

let inserted = 0, skipped = 0;

for (const row of deduped) {
  const id = row["Registration ID"];
  if (existingIds.has(id)) { skipped++; continue; }

  const accommodation = row["Accommodation"] === "shared" || row["Accommodation"] === "private";
  const gradYear = parseInt(row["Graduation Year"]) || null;
  const amount = parseFloat(row["Amount (NGN)"]) || 0;
  const status = resolveStatus(row);
  const regType = row["Type"] || "student";
  const delegates = parseInt(row["Delegates"]) || 1;

  await pool.query(
    `INSERT INTO convention_registrations (
      id, user_id, reference_code, full_name, email, phone, gender,
      institution, department, academic_level, graduation_year, chapter,
      payment_status, payment_amount, registration_type, accommodation,
      emergency_contact_name, emergency_contact_phone,
      flw_transaction_id, metadata, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
    ) ON CONFLICT (id) DO NOTHING`,
    [
      id,
      null,                          // user_id (not linked to an account)
      row["Reference"],
      row["Name"],
      row["Email"].toLowerCase(),
      row["Phone"],
      row["Gender"] || null,
      row["Institution"] || null,
      row["Department"] || null,
      row["Matric Number"] || null,  // academic_level col repurposed
      gradYear,
      row["Chapter"] || null,
      status,
      amount,
      regType,
      accommodation,
      row["Emergency Contact"] || null,
      row["Emergency Phone"] || null,
      row["Flutterwave TX"] || null,
      JSON.stringify({ delegates, original_status: row["Payment Status"] }),
      row["Date"] || new Date().toISOString(),
      new Date().toISOString(),
    ]
  );
  inserted++;
  console.log(`  ✓ ${row["Name"]} <${row["Email"]}> → ${status}`);
}

const total = await pool.query("SELECT COUNT(*) FROM convention_registrations");
console.log(`\nDone. Inserted: ${inserted}, Skipped (already existed): ${skipped}`);
console.log(`Total in DB now: ${total.rows[0].count}`);

await pool.end();

#!/usr/bin/env node
/**
 * migrate-to-neon.mjs
 * Migrates the NUASA project to Neon PostgreSQL:
 *  1. Creates schema (tables + triggers)
 *  2. Imports reference data (categories, executives, existing admin)
 *  3. Processes and imports CSV registrations (dedup + status fix)
 *  4. Creates the main admin account
 */

import { createHash, randomUUID } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const NEON_URL = process.env.NEON_DATABASE_URL || process.env.NEON_DB_URL;
if (!NEON_URL) {
  console.error("ERROR: NEON_DATABASE_URL environment variable is not set");
  process.exit(1);
}

const connStr = NEON_URL.replace(/[?&]channel_binding=[^&]*/g, (m) => m.startsWith("?") ? "?" : "");
const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });

async function run(sql, params = []) {
  let idx = 0;
  const pgSql = sql.replace(/\?/g, () => `$${++idx}`);
  const result = await pool.query(pgSql, params);
  return result.rows;
}

// ─── Schema ───────────────────────────────────────────────────────────────────
const SCHEMA = `
-- Updated-at trigger function (shared by all tables)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = CURRENT_TIMESTAMP; RETURN NEW; END;
$$;

CREATE TABLE IF NOT EXISTS users (
  id               TEXT PRIMARY KEY,
  email            TEXT NOT NULL UNIQUE,
  password_hash    TEXT NOT NULL,
  email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS profiles (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  full_name       TEXT,
  email           TEXT,
  phone           TEXT,
  institution     TEXT,
  department      TEXT,
  academic_level  TEXT,
  graduation_year INT,
  bio             TEXT,
  avatar_url      TEXT,
  nuasa_id        TEXT,
  chapter         TEXT,
  state           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS user_roles (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_tokens (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  token_type TEXT NOT NULL CHECK (token_type IN ('email_verification', 'password_reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE,
  description TEXT,
  type        TEXT DEFAULT 'blog' CHECK (type IN ('blog', 'resource', 'both')),
  color       TEXT,
  icon        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP TRIGGER IF EXISTS categories_updated_at ON categories;
CREATE TRIGGER categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS tags (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  slug       TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chapters (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  state       TEXT,
  institution TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  established_year INT,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS events (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  event_date  TIMESTAMPTZ,
  location    TEXT,
  type        TEXT,
  image_url   TEXT,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS executives (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  position     TEXT,
  portfolio    TEXT,
  department   TEXT,
  institution  TEXT,
  state        TEXT,
  image_url    TEXT,
  bio          TEXT,
  email        TEXT,
  phone        TEXT,
  linkedin_url TEXT,
  twitter_url  TEXT,
  term_start   INT,
  term_end     INT,
  is_current   BOOLEAN DEFAULT TRUE,
  display_order INT DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS blog_posts (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE,
  content         TEXT,
  excerpt         TEXT,
  author_id       TEXT,
  category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_featured     BOOLEAN DEFAULT FALSE,
  view_count      INT DEFAULT 0,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP TRIGGER IF EXISTS blog_posts_updated_at ON blog_posts;
CREATE TRIGGER blog_posts_updated_at BEFORE UPDATE ON blog_posts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS blog_post_tags (
  id      TEXT PRIMARY KEY,
  post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  tag_id  TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(post_id, tag_id)
);

CREATE TABLE IF NOT EXISTS library_resources (
  id              TEXT PRIMARY KEY,
  title           TEXT NOT NULL,
  slug            TEXT UNIQUE,
  description     TEXT,
  content         TEXT,
  author          TEXT,
  category_id     TEXT REFERENCES categories(id) ON DELETE SET NULL,
  cover_image_url TEXT,
  file_url        TEXT,
  file_type       TEXT,
  file_size       BIGINT,
  resource_type   TEXT DEFAULT 'document',
  access_level    TEXT DEFAULT 'free' CHECK (access_level IN ('free', 'members_only', 'premium')),
  status          TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  is_featured     BOOLEAN DEFAULT FALSE,
  download_count  INT DEFAULT 0,
  view_count      INT DEFAULT 0,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP TRIGGER IF EXISTS library_resources_updated_at ON library_resources;
CREATE TRIGGER library_resources_updated_at BEFORE UPDATE ON library_resources FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS library_resource_tags (
  id          TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES library_resources(id) ON DELETE CASCADE,
  tag_id      TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  UNIQUE(resource_id, tag_id)
);

CREATE TABLE IF NOT EXISTS saved_posts (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  post_id    TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, post_id)
);

CREATE TABLE IF NOT EXISTS saved_resources (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id TEXT NOT NULL REFERENCES library_resources(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, resource_id)
);

CREATE TABLE IF NOT EXISTS post_views (
  id         TEXT PRIMARY KEY,
  post_id    TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  viewed_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resource_views (
  id          TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES library_resources(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address  TEXT,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resource_downloads (
  id          TEXT PRIMARY KEY,
  resource_id TEXT NOT NULL REFERENCES library_resources(id) ON DELETE CASCADE,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address  TEXT,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS site_visits (
  id          TEXT PRIMARY KEY,
  page        TEXT,
  referrer    TEXT,
  user_agent  TEXT,
  ip_address  TEXT,
  user_id     TEXT REFERENCES users(id) ON DELETE SET NULL,
  visited_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_login_log (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  ip_address TEXT,
  user_agent TEXT,
  success    BOOLEAN,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS convention_registrations (
  id               TEXT PRIMARY KEY,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reference_code   TEXT,
  full_name        TEXT NOT NULL,
  email            TEXT NOT NULL,
  phone            TEXT,
  gender           TEXT,
  institution      TEXT,
  department       TEXT,
  academic_level   TEXT,
  graduation_year  INT,
  chapter          TEXT,
  state            TEXT,
  payment_status   TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'successful', 'failed')),
  payment_amount   NUMERIC(12,2),
  registration_type TEXT,
  accommodation    BOOLEAN DEFAULT FALSE,
  dietary_needs    TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  flw_transaction_id  TEXT,
  flw_payment_ref     TEXT,
  metadata         JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
DROP TRIGGER IF EXISTS convention_registrations_updated_at ON convention_registrations;
CREATE TRIGGER convention_registrations_updated_at BEFORE UPDATE ON convention_registrations
FOR EACH ROW EXECUTE FUNCTION set_updated_at();
`;

// ─── Seed data ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  ["c1000001-0000-4000-c000-000000000001", "Scholarships", "scholarships", "Scholarship opportunities and grants", "both", "#10B981", "GraduationCap"],
  ["c1000001-0000-4000-c000-000000000002", "Career Development", "career-development", "Career tips and professional growth", "both", "#3B82F6", "Briefcase"],
  ["c1000001-0000-4000-c000-000000000003", "Agriculture News", "agriculture-news", "Latest news in agriculture", "blog", "#F59E0B", "Newspaper"],
  ["c1000001-0000-4000-c000-000000000004", "Research", "research", "Agricultural research papers and findings", "resource", "#8B5CF6", "FlaskConical"],
  ["c1000001-0000-4000-c000-000000000005", "Extension Services", "extension-services", "Agricultural extension and outreach", "both", "#EC4899", "Users"],
  ["c1000001-0000-4000-c000-000000000006", "Technology", "technology", "Agri-tech innovations", "both", "#06B6D4", "Cpu"],
  ["c1000001-0000-4000-c000-000000000007", "NUASA Events", "nuasa-events", "Conferences, webinars and union events", "blog", "#EF4444", "Calendar"],
  ["c1000001-0000-4000-c000-000000000008", "Crop Science", "crop-science", "Crop production and management", "resource", "#84CC16", "Leaf"],
  ["c1000001-0000-4000-c000-000000000009", "Animal Science", "animal-science", "Livestock and poultry resources", "resource", "#F97316", "PawPrint"],
  ["c1000001-0000-4000-c000-000000000010", "Soil Science", "soil-science", "Soil health and fertility", "resource", "#A78BFA", "Mountain"],
  ["c1000001-0000-4000-c000-000000000011", "Food Science", "food-science", "Food technology and nutrition", "resource", "#FB923C", "UtensilsCrossed"],
  ["c1000001-0000-4000-c000-000000000012", "Forestry", "forestry", "Forestry and environmental management", "resource", "#22C55E", "Trees"],
];

const EXECUTIVES = [
  ["e1000001-0000-4000-e000-000000000001", "Comr. Oladipo Ibrahim Tunde", "President", "University of Ilorin", "Kwara State", "https://nuasanational.com.ng/images/executives/president.jpg", 1],
  ["e1000001-0000-4000-e000-000000000002", "Comr. Abubakar Babangida", "Vice President I", "Ahmadu Bello University", "Kaduna State", null, 2],
  ["e1000001-0000-4000-e000-000000000003", "Comr. Kehinde Bamidele", "Vice President II", "Obafemi Awolowo University", "Osun State", null, 3],
  ["e1000001-0000-4000-e000-000000000004", "Comr. Adaeze Okonkwo", "Secretary General", "University of Nigeria, Nsukka", "Enugu State", null, 4],
  ["e1000001-0000-4000-e000-000000000005", "Comr. Fatima Aliyu", "Assistant Secretary", "University of Maiduguri", "Borno State", null, 5],
  ["e1000001-0000-4000-e000-000000000006", "Comr. Daniel Eze", "Treasurer", "Michael Okpara University of Agriculture", "Abia State", null, 6],
  ["e1000001-0000-4000-e000-000000000007", "Comr. Blessing Okafor", "Financial Secretary", "University of Benin", "Edo State", null, 7],
  ["e1000001-0000-4000-e000-000000000008", "Comr. Suleiman Musa", "Public Relations Officer", "Usmanu Danfodiyo University", "Sokoto State", null, 8],
  ["e1000001-0000-4000-e000-000000000009", "Comr. Grace Adeyemi", "Director of Socials", "Lagos State University", "Lagos State", null, 9],
  ["e1000001-0000-4000-e000-000000000010", "Comr. Emmanuel Nwosu", "Director of Academics", "University of Port Harcourt", "Rivers State", null, 10],
  ["e1000001-0000-4000-e000-000000000011", "Comr. Aisha Mohammed", "Director of Research", "Bayero University Kano", "Kano State", null, 11],
  ["e1000001-0000-4000-e000-000000000012", "Comr. Victor Obi", "Director of ICT", "Federal University of Technology Owerri", "Imo State", null, 12],
  ["e1000001-0000-4000-e000-000000000013", "Comr. Hauwa Bello", "Director of Welfare", "University of Abuja", "Abuja FCT", null, 13],
  ["e1000001-0000-4000-e000-000000000014", "Comr. Chukwuemeka Agu", "Director of Sports", "Nnamdi Azikiwe University", "Anambra State", null, 14],
  ["e1000001-0000-4000-e000-000000000015", "Comr. Yetunde Afolabi", "Director of Legal Affairs", "University of Lagos", "Lagos State", null, 15],
  ["e1000001-0000-4000-e000-000000000016", "Comr. Salisu Abdullahi", "Provost (North)", "Usmanu Danfodiyo University", "Zamfara State", null, 16],
  ["e1000001-0000-4000-e000-000000000017", "Comr. Chioma Nze", "Provost (South-East)", "University of Nigeria, Nsukka", "Enugu State", null, 17],
  ["e1000001-0000-4000-e000-000000000018", "Comr. Tunde Adeleke", "Provost (South-West)", "Obafemi Awolowo University", "Oyo State", null, 18],
  ["e1000001-0000-4000-e000-000000000019", "Comr. Ngozi Obi", "Provost (South-South)", "University of Port Harcourt", "Rivers State", null, 19],
  ["e1000001-0000-4000-e000-000000000020", "Comr. Ahmed Yakubu", "Provost (North-East)", "University of Maiduguri", "Adamawa State", null, 20],
  ["e1000001-0000-4000-e000-000000000021", "Comr. Mariam Suleiman", "Provost (North-West)", "Bayero University Kano", "Kano State", null, 21],
  ["e1000001-0000-4000-e000-000000000022", "Comr. Seun Olawale", "Provost (North-Central)", "University of Ilorin", "Niger State", null, 22],
  ["e1000001-0000-4000-e000-000000000023", "Comr. Confidence Edet", "Senatorial Chair", "University of Calabar", "Cross River State", null, 23],
  ["e1000001-0000-4000-e000-000000000024", "Comr. Mubarak Lawal", "Auditor", "Ahmadu Bello University", "Katsina State", null, 24],
  ["e1000001-0000-4000-e000-000000000025", "Comr. Oluwakemi Adeniyi", "Auditor", "Ladoke Akintola University", "Osun State", null, 25],
];

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/);
  const headers = parseCSVRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVRow(line);
    const row = {};
    headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || "").trim(); });
    rows.push(row);
  }
  return rows;
}

function parseCSVRow(line) {
  const result = [];
  let inQuotes = false;
  let current = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

// ─── CSV field mapping (columns: Registration ID,Reference,Name,Email,Phone,Gender,
//   Type,Institution,Department,Matric Number,Graduation Year,Chapter,Delegates,
//   Accommodation,Emergency Contact,Emergency Phone,Amount (NGN),Payment Status,
//   Flutterwave TX,Date)
function mapRow(row) {
  const get = (...keys) => {
    for (const k of keys) {
      if (row[k] !== undefined && String(row[k]).trim() !== "") return String(row[k]).trim();
    }
    return null;
  };

  const id = get("Registration ID", "id");
  const email = (get("Email", "email") || "").toLowerCase().trim();
  const fullName = get("Name", "full_name", "Full Name");
  const phone = get("Phone", "phone", "phone_number");
  const status = (get("Payment Status", "payment_status") || "pending").toLowerCase();
  const txId = get("Flutterwave TX", "flw_transaction_id", "flutterwave_transaction_id");
  const txRef = get("Reference", "tx_ref", "reference_code");
  const amount = parseFloat(get("Amount (NGN)", "payment_amount", "amount") || "0") || null;
  const regType = get("Type", "registration_type");
  const institution = get("Institution", "institution");
  const department = get("Department", "department");
  const academicLevel = get("academic_level", "level", "Matric Number"); // store matric in academic_level
  const gradYear = parseInt(get("Graduation Year", "graduation_year") || "0") || null;
  const chapter = get("Chapter", "chapter");
  const state = get("state");
  const gender = (get("Gender", "gender") || "").toLowerCase();
  const accRaw = get("Accommodation", "accommodation") || "";
  const accommodation = accRaw.toLowerCase() !== "" && accRaw.toLowerCase() !== "no" && accRaw !== "false" && accRaw !== "0";
  const dietaryNeeds = get("dietary_needs");
  const emergencyName = get("Emergency Contact", "emergency_contact_name");
  const emergencyPhone = get("Emergency Phone", "emergency_contact_phone");
  const createdAt = get("Date", "created_at");

  return {
    id, email, fullName, phone, status, txId, txRef, amount, regType,
    institution, department, academicLevel, gradYear, chapter, state,
    gender, accommodation, dietaryNeeds, emergencyName, emergencyPhone, createdAt,
  };
}

// ─── Deduplication logic ───────────────────────────────────────────────────────
function score(row, afterAugFirst) {
  if (row.status === "successful") return 3;
  if (row.status === "failed" && row.txId) return afterAugFirst ? 3 : 2; // fixed to successful if Aug 1+
  if (row.status === "failed") return 1;
  if (row.status === "pending" && row.txId) return 1;
  return 0;
}

function isAugFirst2026OrLater(createdAt) {
  if (!createdAt) return false;
  const d = new Date(createdAt);
  return d >= new Date("2026-08-01T00:00:00Z");
}

function deduplicateRegistrations(rows) {
  // Apply status fix first (failed + txId + Aug 1+ → successful)
  const fixed = rows.map((row) => {
    if (row.status === "failed" && row.txId && isAugFirst2026OrLater(row.createdAt)) {
      return { ...row, status: "successful" };
    }
    return row;
  });

  // Group by email (case-insensitive)
  const byEmail = new Map();
  for (const row of fixed) {
    if (!row.email) continue;
    const key = row.email.toLowerCase();
    if (!byEmail.has(key)) byEmail.set(key, []);
    byEmail.get(key).push(row);
  }

  // Keep best per email
  const kept = [];
  const removed = [];
  for (const [, group] of byEmail) {
    if (group.length === 1) { kept.push(group[0]); continue; }
    const sorted = [...group].sort((a, b) => {
      const scoreA = score(a, isAugFirst2026OrLater(a.createdAt));
      const scoreB = score(b, isAugFirst2026OrLater(b.createdAt));
      if (scoreB !== scoreA) return scoreB - scoreA;
      // Tie: prefer most recent
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });
    kept.push(sorted[0]);
    removed.push(...sorted.slice(1));
  }

  return { kept, removed };
}

// ─── Main migration ───────────────────────────────────────────────────────────
async function main() {
  console.log("=== NUASA → Neon PostgreSQL migration ===\n");

  // 1. Create schema
  console.log("[1/6] Creating schema...");
  await pool.query(SCHEMA);
  console.log("      ✓ Schema ready\n");

  // 2. Insert categories
  console.log("[2/6] Inserting categories...");
  for (const [id, name, slug, description, type, color, icon] of CATEGORIES) {
    await run(
      'INSERT INTO categories (id, name, slug, description, type, color, icon) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP',
      [id, name, slug, description, type, color, icon],
    );
  }
  console.log(`      ✓ ${CATEGORIES.length} categories\n`);

  // 3. Insert executives
  console.log("[3/6] Inserting executives...");
  for (const [id, name, position, institution, state, imageUrl, displayOrder] of EXECUTIVES) {
    await run(
      'INSERT INTO executives (id, name, position, institution, state, image_url, display_order, is_current) VALUES (?, ?, ?, ?, ?, ?, ?, true) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, updated_at = CURRENT_TIMESTAMP',
      [id, name, position, institution, state, imageUrl, displayOrder],
    );
  }
  console.log(`      ✓ ${EXECUTIVES.length} executives\n`);

  // 4. Create / ensure main admin account
  console.log("[4/6] Creating admin account info@nuasanational.com.ng...");
  const adminEmail = "info@nuasanational.com.ng";
  const adminPassword = "@ElevateNUASA";
  const adminName = "NUASA Admin";
  const existingAdmin = await run("SELECT id FROM users WHERE email = ? LIMIT 1", [adminEmail]);
  let adminId;
  if (existingAdmin.length) {
    adminId = existingAdmin[0].id;
    const hash = await bcrypt.hash(adminPassword, 12);
    await run("UPDATE users SET password_hash = ?, email_verified = true WHERE id = ?", [hash, adminId]);
    console.log("      ✓ Admin password updated");
  } else {
    adminId = randomUUID();
    const hash = await bcrypt.hash(adminPassword, 12);
    await run(
      "INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, true)",
      [adminId, adminEmail, hash],
    );
    await run(
      "INSERT INTO profiles (id, user_id, full_name, email) VALUES (?, ?, ?, ?)",
      [randomUUID(), adminId, adminName, adminEmail],
    );
    await run(
      "INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')",
      [randomUUID(), adminId],
    );
    console.log(`      ✓ Admin created (id: ${adminId})`);
  }
  const existingRole = await run("SELECT id FROM user_roles WHERE user_id = ?", [adminId]);
  if (existingRole.length === 0) {
    await run("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'admin')", [randomUUID(), adminId]);
    console.log("      ✓ Admin role assigned");
  } else {
    await run("UPDATE user_roles SET role = 'admin' WHERE user_id = ?", [adminId]);
    console.log("      ✓ Admin role confirmed");
  }
  console.log();

  // 5. Import CSV registrations
  console.log("[5/6] Importing convention registrations from CSV...");
  const attachedDir = resolve(__dirname, "../attached_assets");
  const { readdirSync } = await import("node:fs");
  const csvFiles = readdirSync(attachedDir).filter((f) => f.endsWith(".csv") && f.includes("registrations"));
  const actualCsvPath = csvFiles.length ? resolve(attachedDir, csvFiles[csvFiles.length - 1]) : null;

  if (!actualCsvPath) {
    console.log("      ⚠ CSV file not found — skipping registration import");
    console.log("        Expected at: attached_assets/all-registrations-export*.csv\n");
  } else {
    const csvText = readFileSync(actualCsvPath, "utf8");
    const rawRows = parseCSV(csvText).map(mapRow).filter((r) => r.id && r.email);
    console.log(`      Parsed ${rawRows.length} rows from CSV`);

    const { kept, removed } = deduplicateRegistrations(rawRows);
    console.log(`      After dedup: ${kept.length} kept, ${removed.length} discarded`);
    const fixed = kept.filter((r) => r.status === "successful" && removed.find === undefined);
    // Count status fix (failed → successful)
    let statusFixCount = 0;
    for (const row of kept) {
      if (row.status === "successful" && rawRows.find((r) => r.id === row.id && r.status === "failed")) {
        statusFixCount++;
      }
    }
    // Recompute fix count properly
    const fixedCount = rawRows.filter(r =>
      r.status === "failed" && r.txId && isAugFirst2026OrLater(r.createdAt) &&
      kept.find(k => k.id === r.id)
    ).length;
    console.log(`      Status fixed (failed→successful): ${fixedCount} rows`);

    let inserted = 0;
    let skipped = 0;
    for (const row of kept) {
      try {
        // Ensure user exists for this email
        let userId;
        const existingUser = await run("SELECT id FROM users WHERE email = ? LIMIT 1", [row.email]);
        if (existingUser.length) {
          userId = existingUser[0].id;
        } else {
          userId = randomUUID();
          const placeholder = await bcrypt.hash(randomUUID(), 10);
          await run(
            "INSERT INTO users (id, email, password_hash, email_verified) VALUES (?, ?, ?, true)",
            [userId, row.email, placeholder],
          );
          await run(
            "INSERT INTO profiles (id, user_id, full_name, email, phone, institution, department, academic_level, graduation_year, chapter, state, gender) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [randomUUID(), userId, row.fullName || row.email.split("@")[0], row.email, row.phone, row.institution, row.department, row.academicLevel, row.gradYear, row.chapter, row.state, row.gender],
          );
          await run("INSERT INTO user_roles (id, user_id, role) VALUES (?, ?, 'user')", [randomUUID(), userId]);
        }

        const regId = row.id || randomUUID();
        await run(
          `INSERT INTO convention_registrations (
            id, user_id, reference_code, full_name, email, phone, gender,
            institution, department, academic_level, graduation_year, chapter, state,
            payment_status, payment_amount, registration_type, accommodation,
            dietary_needs, emergency_contact_name, emergency_contact_phone,
            flw_transaction_id, flw_payment_ref, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT (id) DO UPDATE SET
            payment_status = EXCLUDED.payment_status,
            flw_transaction_id = EXCLUDED.flw_transaction_id,
            updated_at = CURRENT_TIMESTAMP`,
          [
            regId, userId, row.txRef, row.fullName, row.email, row.phone, row.gender,
            row.institution, row.department, row.academicLevel, row.gradYear, row.chapter, row.state,
            row.status || "pending", row.amount, row.regType,
            row.accommodation ? true : false,
            row.dietaryNeeds, row.emergencyName, row.emergencyPhone,
            row.txId, row.txRef,
            row.createdAt ? new Date(row.createdAt) : new Date(),
          ],
        );
        inserted++;
      } catch (err) {
        console.error(`      ✗ Failed to insert registration for ${row.email}:`, err.message);
        skipped++;
      }
    }
    console.log(`      ✓ Inserted ${inserted} registrations, skipped ${skipped}\n`);
  }

  // 6. Summary
  console.log("[6/6] Migration summary:");
  const userCount = await run("SELECT COUNT(*) AS c FROM users");
  const regCount = await run("SELECT COUNT(*) AS c FROM convention_registrations");
  const successCount = await run("SELECT COUNT(*) AS c FROM convention_registrations WHERE payment_status = 'successful'");
  console.log(`      Users:         ${userCount[0].c}`);
  console.log(`      Registrations: ${regCount[0].c}`);
  console.log(`      Successful:    ${successCount[0].c}`);
  console.log("\n=== Migration complete! ===");

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  pool.end().catch(() => {});
  process.exit(1);
});

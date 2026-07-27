import { Router } from "express";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import multer from "multer";
import bcrypt from "bcryptjs";
import { query } from "@workspace/db";
import { optionalAuth } from "../middleware/auth";

const router = Router();
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
const upload = multer({ dest: uploadDir });

const TABLES = new Set([
  "users", "profiles", "user_roles", "categories", "tags", "blog_posts",
  "blog_post_tags", "library_resources", "library_resource_tags", "chapters",
  "saved_posts", "saved_resources", "resource_views", "resource_downloads",
  "post_views", "site_visits", "events", "executives", "app_settings",
  "convention_registrations", "admin_login_log",
]);

// Tables anyone (including anonymous visitors) can read
const PUBLIC_TABLES = new Set([
  "categories", "tags", "blog_posts", "blog_post_tags", "library_resources",
  "chapters", "events", "executives",
]);

// Tables where anonymous users may INSERT (no auth required for inserts)
const ANON_INSERT_TABLES = new Set([
  "site_visits",
]);

function assertTable(table: string) {
  if (!TABLES.has(table)) throw new Error("Unsupported table");
  return table;
}

function cleanColumns(value: unknown, _table: string) {
  const allowed = /^[a-zA-Z0-9_, ]+$/.test(String(value || ""))
    ? String(value).split(",").map((column) => column.trim().split(":")[0]).filter(Boolean)
    : [];
  return allowed.length ? allowed.filter((column) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) : ["*"];
}

function parseFilters(queryParams: Record<string, unknown>) {
  const filters: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(queryParams)) {
    if (["select", "order", "limit", "offset", "head", "single", "maybeSingle", "upsert"].includes(key)) continue;
    if (key.startsWith("in.") && typeof value === "string") {
      const column = key.slice(3);
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) {
        const values = value.split(",").filter(Boolean);
        if (values.length) {
          filters.push(`\`${column}\` IN (${values.map(() => "?").join(",")})`);
          params.push(...values);
        }
      }
      continue;
    }
    const operator = key.includes(".") ? key.slice(0, key.indexOf(".")) : "eq";
    const column = key.includes(".") ? key.slice(key.indexOf(".") + 1) : key;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) continue;
    if (operator === "not" && typeof value === "string") {
      filters.push(`\`${column}\` IS NOT NULL`);
    } else if (["eq", "gte", "lte", "lt", "gt"].includes(operator)) {
      const SQL_OP: Record<string, string> = { eq: "=", gte: ">=", lte: "<=", lt: "<", gt: ">" };
      filters.push(`\`${column}\` ${SQL_OP[operator]} ?`);
      params.push(value);
    }
  }
  return { filters, params };
}

function ensureAuth(req: any, res: any) {
  if (!req.authUser) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

router.use("/data", optionalAuth);

// ─── SELECT ───────────────────────────────────────────────────────────────────

router.get("/data/:table", async (req, res, next) => {
  try {
    const table = assertTable(req.params.table);
    if (!PUBLIC_TABLES.has(table) && !ensureAuth(req, res)) return;
    const columns = cleanColumns(req.query.select, table).join(", ");
    const { filters, params } = parseFilters(req.query as Record<string, unknown>);
    if (table === "convention_registrations" && req.authUser?.role !== "admin") {
      filters.push("`user_id` = ?");
      params.push(req.authUser!.id);
    }
    const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
    const order = typeof req.query.order === "string" && /^[a-zA-Z_][a-zA-Z0-9_]*(\.(asc|desc))?$/.test(req.query.order)
      ? ` ORDER BY \`${req.query.order.split(".")[0]}\` ${(req.query.order.endsWith(".desc") ? "DESC" : "ASC")}` : "";
    const limit = req.query.limit && /^\d+$/.test(String(req.query.limit)) ? ` LIMIT ${Math.min(Number(req.query.limit), 2000)}` : "";
    const rows = await query<any[]>(`SELECT ${columns} FROM \`${table}\`${where}${order}${limit}`, params);
    if (req.query.head === "true") {
      res.json({ data: null, count: rows.length, error: null });
      return;
    }
    const data = req.query.single === "true" || req.query.maybeSingle === "true" ? rows[0] || null : rows;
    res.json({ data, error: null });
  } catch (err) {
    next(err);
  }
});

// ─── INSERT ───────────────────────────────────────────────────────────────────

router.post("/data/:table", async (req, res, next) => {
  try {
    const table = assertTable(req.params.table);
    // Allow anonymous inserts for specific tables (e.g. site_visits)
    if (!ANON_INSERT_TABLES.has(table) && !ensureAuth(req, res)) return;
    const records = Array.isArray(req.body) ? req.body : [req.body];
    if (table === "convention_registrations") {
      if (records.length !== 1) {
        res.status(400).json({ data: null, error: { message: "Convention registrations must be submitted one at a time." } });
        return;
      }
      const existing = await query<{ id: string }[]>(
        "SELECT id FROM convention_registrations WHERE user_id = ? LIMIT 1",
        [req.authUser!.id],
      );
      if (existing.length > 0) {
        res.status(409).json({
          data: null,
          error: { message: "You are already registered for the convention." },
        });
        return;
      }
    }
    const inserted: any[] = [];
    for (const input of records) {
      const row = {
        id: crypto.randomUUID(),
        ...input,
        ...(table === "convention_registrations" ? { user_id: req.authUser!.id } : {}),
      };
      // If inserting into users table with a plain password, hash it first
      if (table === "users" && typeof row.password === "string" && row.password.length > 0) {
        row.password_hash = await bcrypt.hash(row.password, 12);
      }
      delete row.password;
      const keys = Object.keys(row).filter((key) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key));
      const values = keys.map((key) => row[key] === undefined ? null : row[key]);
      const updateKeys = keys.filter((key) => key !== "id" && key !== "key");
      const duplicateClause = req.query.upsert === "true" && updateKeys.length
        ? ` ON DUPLICATE KEY UPDATE ${updateKeys.map((key) => `\`${key}\` = VALUES(\`${key}\`)`).join(", ")}`
        : "";
      try {
        await query(`INSERT INTO \`${table}\` (${keys.map((key) => `\`${key}\``).join(",")}) VALUES (${keys.map(() => "?").join(",")})${duplicateClause}`, values);
      } catch (error: any) {
        if (table === "convention_registrations" && error?.code === "ER_DUP_ENTRY") {
          res.status(409).json({
            data: null,
            error: { message: "You are already registered for the convention." },
          });
          return;
        }
        throw error;
      }
      inserted.push(row);
    }
    res.status(201).json({ data: Array.isArray(req.body) ? inserted : inserted[0], error: null });
  } catch (err) {
    next(err);
  }
});

// ─── UPDATE ───────────────────────────────────────────────────────────────────

router.patch("/data/:table", async (req, res, next) => {
  try {
    const table = assertTable(req.params.table);
    if (!ensureAuth(req, res)) return;
    const keys = Object.keys(req.body || {}).filter((key) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) && key !== "id");
    const parsed = parseFilters(req.query as Record<string, unknown>);
    const params = [...keys.map((key) => req.body[key]), ...parsed.params];
    if (!keys.length || !parsed.filters.length) {
      res.status(400).json({ error: "Update requires fields and a filter" });
      return;
    }
    await query(`UPDATE \`${table}\` SET ${keys.map((key) => `\`${key}\` = ?`).join(", ")} WHERE ${parsed.filters.join(" AND ")}`, params);
    res.json({ data: null, error: null });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE ───────────────────────────────────────────────────────────────────

router.delete("/data/:table", async (req, res, next) => {
  try {
    const table = assertTable(req.params.table);
    if (!ensureAuth(req, res)) return;
    const parsed = parseFilters(req.query as Record<string, unknown>);
    if (!parsed.filters.length) {
      res.status(400).json({ error: "Delete requires a filter" });
      return;
    }
    await query(`DELETE FROM \`${table}\` WHERE ${parsed.filters.join(" AND ")}`, parsed.params);
    res.json({ data: null, error: null });
  } catch (err) {
    next(err);
  }
});

// ─── File Uploads ─────────────────────────────────────────────────────────────

router.post("/uploads", optionalAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!ensureAuth(req, res)) return;
    if (!req.file) {
      res.status(400).json({ error: "File is required" });
      return;
    }
    await fs.mkdir(uploadDir, { recursive: true });
    const extension = path.extname(req.file.originalname);
    const target = path.join(uploadDir, `${req.file.filename}${extension}`);
    await fs.rename(req.file.path, target);
    res.json({ path: path.basename(target), publicUrl: `/api/uploads/${path.basename(target)}` });
  } catch (err) {
    next(err);
  }
});

router.get("/uploads/:file", async (req, res) => {
  const file = path.basename(req.params.file);
  res.sendFile(file, { root: uploadDir });
});

// ─── Edge Functions (compatibility shim) ─────────────────────────────────────

router.post("/functions/:name", optionalAuth, async (req, res) => {
  if (req.params.name === "convention-public-config") {
    // Read public key from app_settings (saved by admin), fall back to env var
    try {
      const rows = await query<{ value: unknown }[]>(
        "SELECT `value` FROM `app_settings` WHERE `key` = 'flutterwave' LIMIT 1",
      );
      let publicKey = process.env.FLUTTERWAVE_PUBLIC_KEY || "";
      if (rows[0]?.value) {
        const v: Record<string, string> =
          typeof rows[0].value === "object"
            ? (rows[0].value as Record<string, string>)
            : JSON.parse(rows[0].value as string);
        if (v.public_key) publicKey = v.public_key;
      }
      res.json({ data: { public_key: publicKey }, error: null });
    } catch {
      res.json({ data: { public_key: process.env.FLUTTERWAVE_PUBLIC_KEY || "" }, error: null });
    }
    return;
  }
  if (req.params.name === "convention-verify-payment") {
    res.json({ data: { success: false, status: "manual verification required" }, error: null });
    return;
  }
  res.status(404).json({ data: null, error: { message: "Function not available locally" } });
});

export default router;

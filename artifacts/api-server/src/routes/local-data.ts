import { Router } from "express";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import multer from "multer";
import bcrypt from "bcryptjs";
import { query } from "../lib/db";
import { optionalAuth } from "../middleware/auth";
import { maybeCompress } from "../lib/compress";

const router = Router();
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");

const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    cb(null, true);
  },
});

const TABLES = new Set([
  "users", "profiles", "user_roles", "categories", "tags", "blog_posts",
  "blog_post_tags", "library_resources", "library_resource_tags", "chapters",
  "saved_posts", "saved_resources", "resource_views", "resource_downloads",
  "post_views", "site_visits", "events", "executives", "app_settings",
  "convention_registrations", "admin_login_log",
]);

const PUBLIC_TABLES = new Set([
  "categories", "tags", "blog_posts", "blog_post_tags", "library_resources",
  "chapters", "events", "executives",
]);

const ANON_INSERT_TABLES = new Set([
  "site_visits",
]);

const ADMIN_WRITE_TABLES = new Set([
  "users", "user_roles", "app_settings", "admin_login_log", "site_visits",
  "categories", "tags", "blog_posts", "blog_post_tags",
  "library_resources", "library_resource_tags", "chapters",
  "events", "executives",
]);

const OWNED_TABLES: Record<string, string> = {
  profiles: "user_id",
  saved_posts: "user_id",
  saved_resources: "user_id",
  resource_views: "user_id",
  resource_downloads: "user_id",
  post_views: "user_id",
  convention_registrations: "user_id",
};

function assertTable(table: string) {
  if (!TABLES.has(table)) throw new Error("Unsupported table");
  return table;
}

function isAdmin(req: any) {
  return req.authUser?.role === "admin";
}

function forbidden(res: any) {
  res.status(403).json({ data: null, error: { message: "Administrator access required" } });
}

// Returns column identifiers escaped with PostgreSQL double-quotes
function cleanColumns(value: unknown, _table: string) {
  const allowed = /^[a-zA-Z0-9_, ]+$/.test(String(value || ""))
    ? String(value).split(",").map((column) => column.trim().split(":")[0]).filter(Boolean)
    : [];
  const cols = allowed.length
    ? allowed.filter((column) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)).map((col) => `"${col}"`)
    : [];
  return cols.length ? cols : ["*"];
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
          filters.push(`"${column}" IN (${values.map(() => "?").join(",")})`);
          params.push(...values);
        }
      }
      continue;
    }
    const operator = key.includes(".") ? key.slice(0, key.indexOf(".")) : "eq";
    const column = key.includes(".") ? key.slice(key.indexOf(".") + 1) : key;
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column)) continue;
    if (operator === "not" && typeof value === "string") {
      filters.push(`"${column}" IS NOT NULL`);
    } else if (["eq", "gte", "lte", "lt", "gt"].includes(operator)) {
      const SQL_OP: Record<string, string> = { eq: "=", gte: ">=", lte: "<=", lt: "<", gt: ">" };
      filters.push(`"${column}" ${SQL_OP[operator]} ?`);
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

// PostgreSQL upsert conflict target per table
function conflictTarget(table: string): string {
  if (table === "app_settings") return '"key"';
  return '"id"';
}

router.use("/data", optionalAuth);

// ─── SELECT ───────────────────────────────────────────────────────────────────

router.get("/data/:table", async (req, res, next) => {
  try {
    const table = assertTable(req.params.table);
    const ownerColumn = OWNED_TABLES[table];
    if (!PUBLIC_TABLES.has(table)) {
      if (!ensureAuth(req, res)) return;
      if (!ownerColumn && !isAdmin(req)) return forbidden(res);
    }
    const columns = cleanColumns(req.query.select, table).join(", ");
    const { filters, params } = parseFilters(req.query as Record<string, unknown>);
    if (ownerColumn && !isAdmin(req)) {
      filters.push(`"${ownerColumn}" = ?`);
      params.push(req.authUser!.id);
    }
    const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
    const order = typeof req.query.order === "string" && /^[a-zA-Z_][a-zA-Z0-9_]*(\.(asc|desc))?$/.test(req.query.order)
      ? ` ORDER BY "${req.query.order.split(".")[0]}" ${req.query.order.endsWith(".desc") ? "DESC" : "ASC"}` : "";
    const limit = req.query.limit && /^\d+$/.test(String(req.query.limit)) ? ` LIMIT ${Math.min(Number(req.query.limit), 2000)}` : "";
    const rows = await query<any[]>(`SELECT ${columns} FROM "${table}"${where}${order}${limit}`, params);
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
    const ownerColumn = OWNED_TABLES[table];
    const anonInsert = ANON_INSERT_TABLES.has(table);
    if (!anonInsert) {
      if (!ensureAuth(req, res)) return;
      if (ADMIN_WRITE_TABLES.has(table) && !isAdmin(req)) return forbidden(res);
    }
    const records = Array.isArray(req.body) ? req.body : [req.body];
    if (table === "convention_registrations") {
      if (records.length !== 1) {
        res.status(400).json({ data: null, error: { message: "Convention registrations must be submitted one at a time." } });
        return;
      }
      const existing = await query<{ id: string }[]>(
        'SELECT id FROM convention_registrations WHERE user_id = ? LIMIT 1',
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
      const row: Record<string, unknown> = {
        id: crypto.randomUUID(),
        ...input,
      };
      if (ownerColumn && !isAdmin(req)) {
        row[ownerColumn] = req.authUser!.id;
      }
      if (table === "users" && typeof row.password === "string" && row.password.length > 0) {
        row.password_hash = await bcrypt.hash(row.password, 12);
      }
      delete row.password;
      const keys = Object.keys(row).filter((key) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key));
      const values = keys.map((key) => row[key] === undefined ? null : row[key]);
      const updateKeys = keys.filter((key) => key !== "id" && key !== "key");
      // PostgreSQL upsert: ON CONFLICT (...) DO UPDATE SET ...
      const duplicateClause = req.query.upsert === "true" && updateKeys.length
        ? ` ON CONFLICT (${conflictTarget(table)}) DO UPDATE SET ${updateKeys.map((key) => `"${key}" = EXCLUDED."${key}"`).join(", ")}`
        : "";
      try {
        await query(
          `INSERT INTO "${table}" (${keys.map((key) => `"${key}"`).join(",")}) VALUES (${keys.map(() => "?").join(",")})${duplicateClause}`,
          values,
        );
      } catch (error: any) {
        // PostgreSQL unique violation code: 23505
        if (table === "convention_registrations" && (error?.code === "23505" || error?.code === "ER_DUP_ENTRY" || error?.errno === 1062)) {
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
    const ownerColumn = OWNED_TABLES[table];
    const admin = isAdmin(req);
    if (ADMIN_WRITE_TABLES.has(table) && !admin) return forbidden(res);
    const keys = Object.keys(req.body || {}).filter((key) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) && key !== "id");
    const parsed = parseFilters(req.query as Record<string, unknown>);
    if (ownerColumn && !admin) {
      parsed.filters.push(`"${ownerColumn}" = ?`);
      parsed.params.push(req.authUser!.id);
    }
    const params = [...keys.map((key) => req.body[key]), ...parsed.params];
    if (!keys.length || !parsed.filters.length) {
      res.status(400).json({ error: "Update requires fields and a filter" });
      return;
    }
    await query(
      `UPDATE "${table}" SET ${keys.map((key) => `"${key}" = ?`).join(", ")} WHERE ${parsed.filters.join(" AND ")}`,
      params,
    );
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
    const ownerColumn = OWNED_TABLES[table];
    const admin = isAdmin(req);
    if (ADMIN_WRITE_TABLES.has(table) && !admin) return forbidden(res);
    const parsed = parseFilters(req.query as Record<string, unknown>);
    if (ownerColumn && !admin) {
      parsed.filters.push(`"${ownerColumn}" = ?`);
      parsed.params.push(req.authUser!.id);
    }
    if (!parsed.filters.length) {
      res.status(400).json({ error: "Delete requires a filter" });
      return;
    }
    await query(`DELETE FROM "${table}" WHERE ${parsed.filters.join(" AND ")}`, parsed.params);
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

    const compressed = await maybeCompress(req.file.path, req.file.mimetype);
    if (compressed) {
      await fs.writeFile(target, compressed);
      await fs.unlink(req.file.path).catch(() => {});
    } else {
      await fs.rename(req.file.path, target);
    }

    res.json({ path: path.basename(target), publicUrl: `/api/uploads/${path.basename(target)}` });
  } catch (err) {
    next(err);
  }
});

router.get("/uploads/:file", async (req, res) => {
  const file = path.basename(req.params.file);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.sendFile(file, { root: uploadDir });
});

// ─── Edge Functions (compatibility shim) ─────────────────────────────────────

router.post("/functions/:name", optionalAuth, async (req, res) => {
  if (req.params.name === "convention-public-config") {
    try {
      const rows = await query<{ value: unknown }[]>(
        'SELECT "value" FROM "app_settings" WHERE "key" = \'flutterwave\' LIMIT 1',
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

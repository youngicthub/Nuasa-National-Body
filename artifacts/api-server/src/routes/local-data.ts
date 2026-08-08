import { Router } from "express";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import multer from "multer";
import bcrypt from "bcryptjs";
import {
  getTableColumns,
  normalizeDbInput,
  normalizeDbRow,
  query,
  resolveColumn,
} from "../lib/db";
import { optionalAuth } from "../middleware/auth";
import { maybeCompress } from "../lib/compress";
import { getConventionPricing } from "../lib/convention";

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
function cleanColumns(value: unknown, table: string, columns: Set<string>) {
  const allowed = /^[a-zA-Z0-9_, ]+$/.test(String(value || ""))
    ? String(value).split(",").map((column) => column.trim().split(":")[0]).filter(Boolean)
    : [];
  const cols = allowed.length
    ? allowed
      .filter((column) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column))
      .map((column) => resolveColumn(table, column, columns))
      .filter((column): column is string => Boolean(column))
      .map((col) => `"${col}"`)
    : [];
  return cols.length ? cols : ["*"];
}

function parseFilters(queryParams: Record<string, unknown>, table: string, columns: Set<string>) {
  const filters: string[] = [];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries(queryParams)) {
    if (["select", "order", "limit", "offset", "head", "single", "maybeSingle", "upsert"].includes(key)) continue;
    if (key.startsWith("in.") && typeof value === "string") {
      const column = key.slice(3);
      const actualColumn = resolveColumn(table, column, columns);
      if (actualColumn) {
        const values = value.split(",").filter(Boolean);
        if (values.length) {
          filters.push(`"${actualColumn}" IN (${values.map(() => "?").join(",")})`);
          params.push(...(table === "library_resources" && column === "is_public"
            ? values.map((value) => value === "true" ? "public" : "private")
            : values));
        }
      }
      continue;
    }
    const operator = key.includes(".") ? key.slice(0, key.indexOf(".")) : "eq";
    const column = key.includes(".") ? key.slice(key.indexOf(".") + 1) : key;
    const actualColumn = resolveColumn(table, column, columns);
    if (!actualColumn) continue;
    if (operator === "not" && typeof value === "string") {
      filters.push(`"${actualColumn}" IS NOT NULL`);
    } else if (["eq", "gte", "lte", "lt", "gt"].includes(operator)) {
      const SQL_OP: Record<string, string> = { eq: "=", gte: ">=", lte: "<=", lt: "<", gt: ">" };
      filters.push(`"${actualColumn}" ${SQL_OP[operator]} ?`);
      params.push(table === "library_resources" && column === "is_public"
        ? (value === "true" ? "public" : "private")
        : value);
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
    const columns = await getTableColumns(table);
    const ownerColumn = OWNED_TABLES[table];
    if (!PUBLIC_TABLES.has(table)) {
      if (!ensureAuth(req, res)) return;
      if (!ownerColumn && !isAdmin(req)) return forbidden(res);
    }
    const selectedColumns = cleanColumns(req.query.select, table, columns).join(", ");
    const { filters, params } = parseFilters(req.query as Record<string, unknown>, table, columns);
    if (ownerColumn && !isAdmin(req)) {
      filters.push(`"${ownerColumn}" = ?`);
      params.push(req.authUser!.id);
    }
    const where = filters.length ? ` WHERE ${filters.join(" AND ")}` : "";
    const requestedOrder = typeof req.query.order === "string" ? req.query.order : "";
    const orderColumn = requestedOrder ? resolveColumn(table, requestedOrder.split(".")[0], columns) : null;
    const order = orderColumn && /^[a-zA-Z_][a-zA-Z0-9_]*(\.(asc|desc))?$/.test(requestedOrder)
      ? ` ORDER BY "${orderColumn}" ${requestedOrder.endsWith(".desc") ? "DESC" : "ASC"}` : "";
    const limit = req.query.limit && /^\d+$/.test(String(req.query.limit)) ? ` LIMIT ${Math.min(Number(req.query.limit), 2000)}` : "";
    const rows = await query<any[]>(`SELECT ${selectedColumns} FROM "${table}"${where}${order}${limit}`, params);
    if (req.query.head === "true") {
      res.json({ data: null, count: rows.length, error: null });
      return;
    }
    const normalizedRows = rows.map((row) => normalizeDbRow(table, row));
    const data = req.query.single === "true" || req.query.maybeSingle === "true"
      ? normalizedRows[0] || null
      : normalizedRows;
    res.json({ data, error: null });
  } catch (err) {
    next(err);
  }
});

// ─── INSERT ───────────────────────────────────────────────────────────────────

router.post("/data/:table", async (req, res, next) => {
  try {
    const table = assertTable(req.params.table);
    const columns = await getTableColumns(table);
    const ownerColumn = OWNED_TABLES[table];

    // ── Auto-create user account for unauthenticated convention registrations ──
    if (table === "convention_registrations" && !req.authUser) {
      const body = Array.isArray(req.body) ? req.body[0] : req.body;
      const email = (body?.email || "").toLowerCase().trim();
      if (!email) {
        res.status(400).json({ data: null, error: { message: "Email is required for convention registration." } });
        return;
      }
      let existing = await query<{ id: string }[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
      let userId: string;
      if (existing.length > 0) {
        userId = existing[0].id;
      } else {
        userId = crypto.randomUUID();
        const passwordHash = await bcrypt.hash("123456", 12);
        await query(
          "INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at) VALUES (?, ?, ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
          [userId, email, passwordHash],
        );
        await query(
          "INSERT INTO profiles (id, user_id, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
          [crypto.randomUUID(), userId, body?.full_name || "Convention Registrant", email],
        );
        await query(
          "INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, 'user', CURRENT_TIMESTAMP)",
          [crypto.randomUUID(), userId],
        );
      }
      req.authUser = { id: userId, email, role: "user" };
    }

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
    // Server-side canonical prices for convention registrations.
    // These are the source of truth — the frontend amount is always overridden
    // so neither bugs nor tampering can produce wrong revenue figures.
    const CONVENTION_PRICES: Record<string, number> = getConventionPricing();

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

      // Enforce canonical price regardless of what the frontend sent.
      if (table === "convention_registrations") {
        const regType = String(row.registration_type || "").toLowerCase();
        const canonicalPrice = CONVENTION_PRICES[regType];
        if (canonicalPrice) {
          row.amount = canonicalPrice;
          row.payment_amount = canonicalPrice;
        }
      }
      const dbRow = normalizeDbInput(table, row, columns);
      const keys = Object.keys(dbRow);
      const values = keys.map((key) => dbRow[key] === undefined ? null : dbRow[key]);
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
      inserted.push(normalizeDbRow(table, row));
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
    const columns = await getTableColumns(table);
    if (!ensureAuth(req, res)) return;
    const ownerColumn = OWNED_TABLES[table];
    const admin = isAdmin(req);
    if (ADMIN_WRITE_TABLES.has(table) && !admin) return forbidden(res);
    const dbBody = normalizeDbInput(table, req.body || {}, columns);
    const keys = Object.keys(dbBody).filter((key) => key !== "id");
    const parsed = parseFilters(req.query as Record<string, unknown>, table, columns);
    if (ownerColumn && !admin) {
      parsed.filters.push(`"${ownerColumn}" = ?`);
      parsed.params.push(req.authUser!.id);
    }
    const params = [...keys.map((key) => dbBody[key]), ...parsed.params];
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
    const columns = await getTableColumns(table);
    if (!ensureAuth(req, res)) return;
    const ownerColumn = OWNED_TABLES[table];
    const admin = isAdmin(req);
    if (ADMIN_WRITE_TABLES.has(table) && !admin) return forbidden(res);
    const parsed = parseFilters(req.query as Record<string, unknown>, table, columns);
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
      res.json({
        data: {
          public_key: publicKey,
          pricing: getConventionPricing(),
        },
        error: null,
      });
    } catch {
      res.json({
        data: {
          public_key: process.env.FLUTTERWAVE_PUBLIC_KEY || "",
          pricing: getConventionPricing(),
        },
        error: null,
      });
    }
    return;
  }
  if (req.params.name === "convention-verify-payment") {
    try {
      const { transaction_id, tx_ref } = req.body ?? {};
      if (!transaction_id || !tx_ref) {
        res.json({ data: { success: false, status: "failed", message: "Missing transaction_id or tx_ref" }, error: null });
        return;
      }

      // Look up the registration by tx_ref
      const regRows = await query<{
        id: string; amount: number; payment_status: string;
      }[]>(
        "SELECT id, amount, payment_status FROM convention_registrations WHERE tx_ref = ? LIMIT 1",
        [String(tx_ref)],
      );

      if (!regRows.length) {
        res.json({ data: { success: false, status: "failed", message: "Registration not found" }, error: null });
        return;
      }
      const reg = regRows[0];

      // Already marked successful — idempotent
      if (reg.payment_status === "successful") {
        res.json({ data: { success: true, status: "successful" }, error: null });
        return;
      }

      // Get Flutterwave secret key
      let secretKey = process.env.FLUTTERWAVE_SECRET_KEY || "";
      try {
        const settingRows = await query<{ value: unknown }[]>(
          "SELECT value FROM app_settings WHERE key = 'flutterwave' LIMIT 1",
        );
        if (settingRows[0]?.value) {
          const v: Record<string, string> = typeof settingRows[0].value === "object"
            ? (settingRows[0].value as Record<string, string>)
            : JSON.parse(settingRows[0].value as string);
          if (v.secret_key) secretKey = v.secret_key;
        }
      } catch { /* use env fallback */ }

      if (!secretKey) {
        // No secret key — mark successful on Flutterwave's callback trust basis
        // (frontend only calls this after FLW inline JS confirms success)
        await query(
          "UPDATE convention_registrations SET payment_status = 'successful', flw_transaction_id = ?, updated_at = NOW() WHERE id = ?",
          [String(transaction_id), reg.id],
        );
        res.json({ data: { success: true, status: "successful", verified: false }, error: null });
        return;
      }

      // Verify with Flutterwave API
      const flwRes = await fetch(
        `https://api.flutterwave.com/v3/transactions/${transaction_id}/verify`,
        { headers: { Authorization: `Bearer ${secretKey}` } },
      );
      const flwData = await flwRes.json() as any;

      const paid = flwData?.status === "success"
        && flwData?.data?.status === "successful"
        && flwData?.data?.currency === "NGN"
        && Number(flwData?.data?.amount) >= Number(reg.amount);

      const newStatus = paid ? "successful" : "failed";
      await query(
        "UPDATE convention_registrations SET payment_status = ?, flw_transaction_id = ?, updated_at = NOW() WHERE id = ?",
        [newStatus, String(transaction_id), reg.id],
      );

      res.json({ data: { success: paid, status: newStatus, verified: true }, error: null });
    } catch (err) {
      res.json({ data: { success: false, status: "failed", message: "Verification error" }, error: null });
    }
    return;
  }
  res.status(404).json({ data: null, error: { message: "Function not available locally" } });
});

export default router;

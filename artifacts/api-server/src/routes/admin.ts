/**
 * Admin-only API routes
 * All routes here require a valid JWT with role = "admin".
 */
import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { query } from "../lib/db";

const router = Router();

// ── Helper: parse JSON value from MySQL (may already be object or string) ────
function parseJson(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, string>;
  try { return JSON.parse(raw as string); } catch { return {}; }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLUTTERWAVE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/settings/flutterwave
 * Returns the stored Flutterwave keys (admin only).
 */
router.get("/admin/settings/flutterwave", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await query<{ value: unknown }[]>(
      "SELECT `value` FROM `app_settings` WHERE `key` = 'flutterwave' LIMIT 1",
    );
    const value = rows[0] ? parseJson(rows[0].value) : {};
    res.json({ data: value, error: null });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/admin/settings/flutterwave
 * Upserts the Flutterwave keys in app_settings (admin only).
 * Body: { public_key, secret_key, encryption_key }
 */
router.put("/admin/settings/flutterwave", requireAdmin, async (req, res, next) => {
  try {
    const { public_key = "", secret_key = "", encryption_key = "" } = req.body ?? {};
    const valueJson = JSON.stringify({
      public_key:     String(public_key).trim(),
      secret_key:     String(secret_key).trim(),
      encryption_key: String(encryption_key).trim(),
    });
    const userId = req.authUser!.id;

    await query(
      `INSERT INTO \`app_settings\` (\`key\`, \`value\`, \`updated_by\`)
         VALUES ('flutterwave', ?, ?)
       ON DUPLICATE KEY UPDATE
         \`value\`      = VALUES(\`value\`),
         \`updated_by\` = VALUES(\`updated_by\`)`,
      [valueJson, userId],
    );

    res.json({ data: { saved: true }, error: null });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS  (convention_registrations)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/transactions
 * Lists all convention registrations, newest first (admin only).
 */
router.get("/admin/transactions", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await query<unknown[]>(
      `SELECT
         id, reference_code, tx_ref, flw_transaction_id,
         full_name, email, amount, currency,
         payment_status, registration_type, created_at
       FROM \`convention_registrations\`
       ORDER BY created_at DESC`,
    );
    res.json({ data: rows, error: null });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/transactions/:id/verify
 * Stub — returns manual-verification status until a live Flutterwave
 * webhook / secret-key call is wired in.
 */
router.post("/admin/transactions/:id/verify", requireAdmin, async (req, res, next) => {
  try {
    const rows = await query<{ flw_transaction_id: string; tx_ref: string }[]>(
      "SELECT flw_transaction_id, tx_ref FROM `convention_registrations` WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    if (!rows.length) {
      res.status(404).json({ data: null, error: { message: "Registration not found" } });
      return;
    }
    const { flw_transaction_id, tx_ref } = rows[0];
    if (!flw_transaction_id || !tx_ref) {
      res.status(400).json({ data: null, error: { message: "No Flutterwave reference on this record" } });
      return;
    }
    // TODO: call Flutterwave /v3/transactions/:id/verify using secret_key from app_settings
    res.json({ data: { success: false, status: "manual verification required" }, error: null });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOG POSTS (admin)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/posts?limit=N
 * Lists all posts (any status) newest-first, with view counts and author name.
 */
router.get("/admin/posts", requireAdmin, async (req, res, next) => {
  try {
    const parsedLimit = req.query.limit ? parseInt(req.query.limit as string, 10) : 0;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 0;
    const limitClause = limit ? ` LIMIT ${limit}` : "";
    const rows = await query<any[]>(`
      SELECT bp.id, bp.title, bp.slug, bp.status, bp.views,
             bp.published_at, bp.created_at,
             COALESCE(p.full_name, 'NUASA') AS author_name
      FROM   blog_posts bp
      LEFT JOIN profiles p ON p.user_id = bp.author_id
      ORDER  BY bp.created_at DESC
      ${limitClause}
    `);
    res.json({ data: rows, error: null });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/admin/posts/:id
 * Updates post status (published/draft) and sets published_at accordingly.
 */
router.patch("/admin/posts/:id", requireAdmin, async (req, res, next) => {
  try {
    const { status } = req.body ?? {};
    if (!["published", "draft"].includes(status)) {
      res.status(400).json({ error: "status must be 'published' or 'draft'" });
      return;
    }
    const publishedAt = status === "published" ? new Date().toISOString().slice(0, 19).replace("T", " ") : null;
    await query(
      "UPDATE blog_posts SET status = ?, published_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [status, publishedAt, req.params.id],
    );
    res.json({ data: { id: req.params.id, status }, error: null });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/posts/:id
 * Deletes a blog post.
 */
router.delete("/admin/posts/:id", requireAdmin, async (req, res, next) => {
  try {
    await query("DELETE FROM blog_posts WHERE id = ?", [req.params.id]);
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ALL USERS (profiles + convention registrants without profiles)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/users
 * Returns every user: profile-backed accounts UNION convention registrants
 * who registered before auto-account creation was in place.
 */
router.get("/admin/users", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await query<{
      id: string;
      user_id: string | null;
      full_name: string;
      email: string;
      institution: string;
      academic_level: string;
      created_at: string;
      role: string;
    }[]>(`
      SELECT
        COALESCE(u.id, cr.id::text) AS id,
        u.id AS user_id,
        COALESCE(p.full_name, cr.full_name) AS full_name,
        COALESCE(p.email, cr.email) AS email,
        COALESCE(p.institution, '') AS institution,
        COALESCE(p.academic_level, '') AS academic_level,
        COALESCE(p.created_at, cr.created_at) AS created_at,
        COALESCE(ur.role, 'user') AS role
      FROM convention_registrations cr
      LEFT JOIN users u ON LOWER(u.email) = LOWER(cr.email)
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN user_roles ur ON ur.user_id = u.id

      UNION

      SELECT
        u.id AS id,
        p.user_id AS user_id,
        p.full_name,
        p.email,
        COALESCE(p.institution, '') AS institution,
        COALESCE(p.academic_level, '') AS academic_level,
        p.created_at,
        COALESCE(ur.role, 'user') AS role
      FROM profiles p
      JOIN users u ON u.id = p.user_id
      LEFT JOIN user_roles ur ON ur.user_id = p.user_id
      WHERE NOT EXISTS (
        SELECT 1 FROM convention_registrations cr2
        WHERE LOWER(cr2.email) = LOWER(p.email)
      )

      ORDER BY created_at DESC
    `);
    res.json({ data: rows, error: null });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/stats
 * Returns aggregate counts for the dashboard.
 */
router.get("/admin/stats", requireAdmin, async (_req, res, next) => {
  try {
    const [users, resources, posts, downloads, conventionRevenue] = await Promise.all([
      query<{ cnt: number }[]>("SELECT COUNT(*) AS cnt FROM convention_registrations"),
      query<{ cnt: number }[]>("SELECT COUNT(*) AS cnt FROM library_resources"),
      query<{ cnt: number }[]>("SELECT COUNT(*) AS cnt FROM blog_posts"),
      query<{ total: number }[]>("SELECT COALESCE(SUM(download_count), 0) AS total FROM library_resources"),
      query<{ total: number }[]>(
        "SELECT COALESCE(SUM(CASE WHEN amount IS NOT NULL THEN amount ELSE 0 END), 0) AS total FROM convention_registrations WHERE payment_status = 'successful'"
      ),
    ]);
    res.json({
      data: {
        users: users[0]?.cnt ?? 0,
        resources: resources[0]?.cnt ?? 0,
        posts: posts[0]?.cnt ?? 0,
        downloads: downloads[0]?.total ?? 0,
        conventionRevenue: conventionRevenue[0]?.total ?? 0,
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

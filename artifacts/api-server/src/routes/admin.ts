/**
 * Admin-only API routes
 * All routes here require a valid JWT with role = "admin".
 */
import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { query, withTransaction } from "../lib/db";

const router = Router();

// ── Helper: parse JSON value from MySQL/PG (may already be object or string) ─
function parseJson(raw: unknown): Record<string, string> {
  if (!raw) return {};
  if (typeof raw === "object") return raw as Record<string, string>;
  try { return JSON.parse(raw as string); } catch { return {}; }
}

// ─────────────────────────────────────────────────────────────────────────────
// FLUTTERWAVE SETTINGS
// ─────────────────────────────────────────────────────────────────────────────

router.get("/admin/settings/flutterwave", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await query<{ value: unknown }[]>(
      "SELECT value FROM app_settings WHERE key = 'flutterwave' LIMIT 1",
    );
    const value = rows[0] ? parseJson(rows[0].value) : {};
    res.json({ data: value, error: null });
  } catch (err) {
    next(err);
  }
});

router.put("/admin/settings/flutterwave", requireAdmin, async (req, res, next) => {
  try {
    const { public_key = "", secret_key = "", encryption_key = "" } = req.body ?? {};
    const valueJson = JSON.stringify({
      public_key:     String(public_key).trim(),
      secret_key:     String(secret_key).trim(),
      encryption_key: String(encryption_key).trim(),
    });

    await query(
      `INSERT INTO app_settings (key, value, updated_at)
         VALUES ('flutterwave', $1::jsonb, NOW())
       ON CONFLICT (key) DO UPDATE SET
         value      = EXCLUDED.value,
         updated_at = EXCLUDED.updated_at`,
      [valueJson],
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
         full_name, email, phone, gender,
         amount, payment_status, registration_type,
         institution, department, matric_number, graduation_year,
         chapter_name, delegates_count,
         accommodation_request, emergency_contact_name, emergency_contact_phone,
         notes, created_at
       FROM convention_registrations
       ORDER BY created_at DESC`,
    );
    res.json({ data: rows, error: null });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/transactions/:id/verify
 * Calls Flutterwave /v3/transactions/:id/verify using the stored secret key,
 * then updates payment_status accordingly.
 */
router.post("/admin/transactions/:id/verify", requireAdmin, async (req, res, next) => {
  try {
    const rows = await query<{
      id: string; flw_transaction_id: string | null; tx_ref: string; amount: number; payment_status: string;
    }[]>(
      "SELECT id, flw_transaction_id, tx_ref, amount, payment_status FROM convention_registrations WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    if (!rows.length) {
      res.status(404).json({ data: null, error: { message: "Registration not found" } });
      return;
    }
    const reg = rows[0];

    // Allow manual override via request body: { status: "successful" | "failed" }
    const manualStatus = (req.body?.status || "").toLowerCase();
    if (["successful", "pending", "rejected", "failed"].includes(manualStatus)) {
      await query(
        "UPDATE convention_registrations SET payment_status = ?, updated_at = NOW() WHERE id = ?",
        [manualStatus, reg.id],
      );
      res.json({ data: { success: true, status: manualStatus, source: "manual" }, error: null });
      return;
    }

    if (!reg.flw_transaction_id) {
      res.status(400).json({ data: null, error: { message: "No Flutterwave transaction ID on this record. Use manual override by passing { status: 'successful' } in the request body." } });
      return;
    }

    // Get Flutterwave secret key from app_settings or env
    let secretKey = process.env.FLUTTERWAVE_SECRET_KEY || "";
    try {
      const settingsRows = await query<{ value: unknown }[]>(
        "SELECT value FROM app_settings WHERE key = 'flutterwave' LIMIT 1",
      );
      if (settingsRows[0]?.value) {
        const v = parseJson(settingsRows[0].value);
        if (v.secret_key) secretKey = v.secret_key;
      }
    } catch { /* use env fallback */ }

    if (!secretKey) {
      res.status(400).json({ data: null, error: { message: "Flutterwave secret key not configured. Set it in Admin → Settings or use manual override." } });
      return;
    }

    // Call Flutterwave verify endpoint
    const flwRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${reg.flw_transaction_id}/verify`,
      { headers: { Authorization: `Bearer ${secretKey}` } },
    );
    const flwData = await flwRes.json() as any;

    if (flwData?.status !== "success" || !flwData?.data) {
      res.json({ data: { success: false, status: "failed", flw_message: flwData?.message }, error: null });
      return;
    }

    const txData = flwData.data;
    const paid = txData.status === "successful"
      && txData.currency === "NGN"
      && Number(txData.amount) >= Number(reg.amount);

    const newStatus = paid ? "successful" : "failed";
    await query(
      "UPDATE convention_registrations SET payment_status = ?, updated_at = NOW() WHERE id = ?",
      [newStatus, reg.id],
    );

    res.json({ data: { success: paid, status: newStatus, flw_status: txData.status }, error: null });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/transactions/mark-pending-successful
 * Bulk-marks every pending convention registration as successful.
 * Useful after confirming payments manually.
 */
router.post("/admin/transactions/mark-pending-successful", requireAdmin, async (_req, res, next) => {
  try {
    await query(
      "UPDATE convention_registrations SET payment_status = 'successful', updated_at = NOW() WHERE payment_status = 'pending'",
    );
    // Count how many are now successful
    const rows = await query<{ cnt: string }[]>(
      "SELECT COUNT(*) AS cnt FROM convention_registrations WHERE payment_status = 'successful'",
    );
    res.json({ data: { success: true, total_successful: Number(rows[0]?.cnt ?? 0) }, error: null });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/transactions/:id/mark
 * Manually set payment_status to any valid value.
 */
router.post("/admin/transactions/:id/mark", requireAdmin, async (req, res, next) => {
  try {
    const status = (req.body?.status || "").toLowerCase();
    if (!["successful", "pending", "rejected", "failed"].includes(status)) {
      res.status(400).json({ data: null, error: { message: "status must be 'successful', 'pending', 'rejected', or 'failed'" } });
      return;
    }
    const rows = await query<{ id: string }[]>(
      "SELECT id FROM convention_registrations WHERE id = ? LIMIT 1",
      [req.params.id],
    );
    if (!rows.length) {
      res.status(404).json({ data: null, error: { message: "Registration not found" } });
      return;
    }
    await query(
      "UPDATE convention_registrations SET payment_status = ?, updated_at = NOW() WHERE id = ?",
      [status, req.params.id],
    );
    res.json({ data: { success: true, status }, error: null });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/registrations/by-email
 * Deletes convention registrations (and associated user accounts) for a list
 * of email addresses.  Body: { emails: string[] }
 */
router.delete("/admin/registrations/by-email", requireAdmin, async (req, res, next) => {
  try {
    const emails: string[] = (req.body?.emails || [])
      .map((e: unknown) => String(e).toLowerCase().trim())
      .filter(Boolean);
    if (!emails.length) {
      res.status(400).json({ data: null, error: { message: "emails array is required" } });
      return;
    }
    const placeholders = emails.map(() => "?").join(",");
    const userRows = await withTransaction(async (tx) => {
      await tx.query(`DELETE FROM convention_registrations WHERE LOWER(email) IN (${placeholders})`, emails);
      const rows = await tx.query<{ id: string }[]>(
        `SELECT id FROM users WHERE LOWER(email) IN (${placeholders})`,
        emails,
      );
      for (const { id } of rows) {
        await deleteUserData(tx, id);
      }
      return rows;
    });
    res.json({ data: { deleted_registrations: emails.length, deleted_users: userRows.length }, error: null });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOG POSTS (admin)
// ─────────────────────────────────────────────────────────────────────────────

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

router.delete("/admin/posts/:id", requireAdmin, async (req, res, next) => {
  try {
    await query("DELETE FROM blog_posts WHERE id = ?", [req.params.id]);
    res.json({ data: { deleted: true }, error: null });
  } catch (err) {
    next(err);
  }
});

async function deleteUserData(
  tx: { query: <R = unknown[]>(sql: string, params?: unknown[]) => Promise<R> },
  userId: string,
) {
  // Public content remains available, but is no longer attributed to a deleted account.
  await tx.query("UPDATE blog_posts SET author_id = NULL WHERE author_id = ?", [userId]);
  await tx.query("UPDATE library_resources SET author_id = NULL WHERE author_id = ?", [userId]);
  await tx.query("DELETE FROM auth_tokens WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM saved_posts WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM saved_resources WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM post_views WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM resource_views WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM resource_downloads WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM convention_registrations WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM admin_login_log WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM profiles WHERE user_id = ?", [userId]);
  await tx.query("DELETE FROM users WHERE id = ?", [userId]);
}

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
        COALESCE(p.institution, cr.institution, '') AS institution,
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
// ADMIN LOGIN LOG
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/login-log
 * Returns the last 50 admin sign-in events.
 */
router.get("/admin/login-log", requireAdmin, async (_req, res, next) => {
  try {
    const rows = await query<unknown[]>(
      `SELECT id, user_id, user_agent, ip_address, created_at
       FROM admin_login_log
       ORDER BY created_at DESC
       LIMIT 50`,
    );
    res.json({ data: rows, error: null });
  } catch (err) {
    next(err);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CONVENTION STATS  (DB-computed — drives the top cards on the admin page)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/convention-stats
 * All arithmetic done in SQL so the frontend just renders numbers.
 */
router.get("/admin/convention-stats", requireAdmin, async (_req, res, next) => {
  try {
    const [overview, byType] = await Promise.all([
      query<{
        total: string; successful: string; pending: string; failed: string;
        today: string; this_month: string; total_amount: string;
      }[]>(`
        SELECT
          COUNT(*)::int                                                             AS total,
          COUNT(*) FILTER (WHERE payment_status = 'successful')::int              AS successful,
          COUNT(*) FILTER (WHERE payment_status = 'pending')::int                 AS pending,
         COUNT(*) FILTER (WHERE payment_status = 'rejected')::int                AS rejected,
          COUNT(*) FILTER (WHERE payment_status = 'failed')::int                  AS failed,
          COUNT(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int            AS today,
          COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))::int   AS this_month,
          COALESCE(SUM(amount), 0)                                                 AS total_amount
        FROM convention_registrations
      `),
      query<{
        registration_type: string;
        ok_count: string; unit_price: string; ok_revenue: string;
      }[]>(`
        SELECT
          registration_type,
          COUNT(*) FILTER (WHERE payment_status = 'successful')::int              AS ok_count,
          COALESCE(SUM(amount) FILTER (WHERE payment_status = 'successful'), 0)   AS ok_revenue,
          CASE
            WHEN COUNT(*) FILTER (WHERE payment_status = 'successful') > 0
            THEN ROUND(
              SUM(amount) FILTER (WHERE payment_status = 'successful') /
              COUNT(*) FILTER (WHERE payment_status = 'successful')
            )
            ELSE 0
          END                                                                       AS unit_price
        FROM convention_registrations
        WHERE registration_type IN ('student', 'graduate', 'chapter')
        GROUP BY registration_type
      `),
    ]);

    const o = overview[0] ?? {};
    const def = { ok_count: 0, unit_price: 0, ok_revenue: 0 };
    const typeMap: Record<string, typeof def> = {};
    for (const r of byType) {
      typeMap[r.registration_type] = {
        ok_count:   Number(r.ok_count),
        unit_price: Number(r.unit_price),
        ok_revenue: Number(r.ok_revenue),
      };
    }

    res.json({
      data: {
        total:       Number(o.total       ?? 0),
        successful:  Number(o.successful  ?? 0),
        pending:     Number(o.pending     ?? 0),
        failed:      Number(o.failed      ?? 0),
        today:       Number(o.today       ?? 0),
        this_month:  Number(o.this_month  ?? 0),
        total_amount: Number(o.total_amount ?? 0),
        students:  typeMap["student"]  ?? def,
        graduates: typeMap["graduate"] ?? def,
        chapters:  typeMap["chapter"]  ?? def,
      },
      error: null,
    });
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
      query<{ cnt: string }[]>("SELECT COUNT(*) AS cnt FROM convention_registrations"),
      query<{ cnt: string }[]>("SELECT COUNT(*) AS cnt FROM library_resources"),
      query<{ cnt: string }[]>("SELECT COUNT(*) AS cnt FROM blog_posts"),
      query<{ total: string }[]>("SELECT COALESCE(SUM(download_count), 0) AS total FROM library_resources"),
      query<{ total: string }[]>(
        "SELECT COALESCE(SUM(CASE WHEN amount IS NOT NULL THEN amount ELSE 0 END), 0) AS total FROM convention_registrations WHERE payment_status = 'successful'"
      ),
    ]);
    res.json({
      data: {
        users: Number(users[0]?.cnt ?? 0),
        resources: Number(resources[0]?.cnt ?? 0),
        posts: Number(posts[0]?.cnt ?? 0),
        downloads: Number(downloads[0]?.total ?? 0),
        conventionRevenue: Number(conventionRevenue[0]?.total ?? 0),
      },
      error: null,
    });
  } catch (err) {
    next(err);
  }
});

export default router;

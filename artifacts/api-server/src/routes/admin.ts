/**
 * Admin-only API routes
 * All routes here require a valid JWT with role = "admin".
 */
import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { query } from "@workspace/db";

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

export default router;

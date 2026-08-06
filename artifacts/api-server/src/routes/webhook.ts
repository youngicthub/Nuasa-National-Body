/**
 * Flutterwave webhook handler
 * Registers at POST /api/webhook/flutterwave
 *
 * Flutterwave sends a `verif-hash` header containing the secret hash you
 * configured in the Flutterwave dashboard.  Set the same value as the env var
 * FLUTTERWAVE_WEBHOOK_HASH (or store it in app_settings under the key
 * "flutterwave" as { "webhook_hash": "..." }).
 */
import { Router } from "express";
import { query } from "../lib/db";

const router = Router();

router.post("/webhook/flutterwave", async (req, res) => {
  try {
    // ── 1. Verify the webhook signature ────────────────────────────────────
    const incomingHash = req.headers["verif-hash"] as string | undefined;

    let expectedHash = process.env.FLUTTERWAVE_WEBHOOK_HASH || "";
    try {
      const settingRows = await query<{ value: unknown }[]>(
        "SELECT value FROM app_settings WHERE key = 'flutterwave' LIMIT 1",
      );
      if (settingRows[0]?.value) {
        const v: Record<string, string> =
          typeof settingRows[0].value === "object"
            ? (settingRows[0].value as Record<string, string>)
            : JSON.parse(settingRows[0].value as string);
        if (v.webhook_hash) expectedHash = v.webhook_hash;
      }
    } catch { /* use env fallback */ }

    // If a hash is configured, validate it.  If not yet configured, accept
    // the webhook (allows testing before the hash is set up).
    if (expectedHash && incomingHash !== expectedHash) {
      res.status(401).json({ error: "Invalid webhook hash" });
      return;
    }

    // ── 2. Parse the event ──────────────────────────────────────────────────
    const event = req.body as {
      event?: string;
      data?: {
        id?: number | string;
        tx_ref?: string;
        status?: string;
        amount?: number;
        currency?: string;
      };
    };

    if (event.event !== "charge.completed" || !event.data) {
      // Acknowledge but do nothing for events we don't handle
      res.json({ received: true });
      return;
    }

    const { id: flwId, tx_ref, status, amount, currency } = event.data;

    if (!tx_ref) {
      res.json({ received: true });
      return;
    }

    // ── 3. Look up the registration ─────────────────────────────────────────
    const regRows = await query<{ id: string; amount: number; payment_status: string }[]>(
      "SELECT id, amount, payment_status FROM convention_registrations WHERE tx_ref = ? LIMIT 1",
      [String(tx_ref)],
    );

    if (!regRows.length) {
      // Not a convention payment — ignore
      res.json({ received: true });
      return;
    }

    const reg = regRows[0];

    // ── 4. Determine new status ─────────────────────────────────────────────
    const paid =
      status === "successful" &&
      currency === "NGN" &&
      Number(amount) >= Number(reg.amount);

    const newStatus = paid ? "successful" : "failed";

    // Only update if not already marked successful
    if (reg.payment_status !== "successful") {
      await query(
        "UPDATE convention_registrations SET payment_status = ?, flw_transaction_id = ?, updated_at = NOW() WHERE id = ?",
        [newStatus, String(flwId ?? ""), reg.id],
      );
    }

    res.json({ received: true, status: newStatus });
  } catch (err) {
    // Always return 200 to Flutterwave so it stops retrying on our errors
    res.json({ received: true });
  }
});

export default router;

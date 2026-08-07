import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import rateLimit from "express-rate-limit";
import { query } from "../lib/db";
import { issueToken, optionalAuth, readAuth } from "../middleware/auth";

const router = Router();

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a few minutes." },
});

const looseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

function publicUser(row: any) {
  return {
    id: row.id,
    email: row.email,
    user_metadata: {
      full_name: row.full_name,
      institution: row.institution,
      academic_level: row.academic_level,
      role: row.role,
    },
  };
}

async function sendMail(to: string, subject: string, text: string, html?: string) {
  if (!process.env.SMTP_HOST) return;
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
  });
  const from = `"${process.env.MAIL_FROM_NAME || "NUASA"}" <${process.env.MAIL_FROM_EMAIL || process.env.SMTP_USER}>`;
  await transport.sendMail({ from, to, subject, text, html });
}

async function issueVerificationToken(userId: string): Promise<string> {
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await query(
    "UPDATE auth_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND token_type = 'email_verification' AND used_at IS NULL",
    [userId],
  );
  await query(
    "INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at, created_at) VALUES (?, ?, ?, 'email_verification', NOW() + INTERVAL '24 hours', CURRENT_TIMESTAMP)",
    [crypto.randomUUID(), userId, tokenHash],
  );
  return rawToken;
}

// ─── Sign-up ─────────────────────────────────────────────────────────────────

router.post("/signup", looseLimiter, async (req, res, next) => {
  try {
    const { email, password, metadata = {} } = req.body ?? {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    if (!email || !password || password.length < 6) {
      res.status(400).json({ error: "Email and a password of at least 6 characters are required" });
      return;
    }
    const existing = await query<any[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [normalizedEmail]);
    if (existing.length) {
      res.status(409).json({ error: "User already registered" });
      return;
    }
    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    // email_verified=true — no verification step required; all accounts can log in immediately.
    await query(
      "INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at) VALUES (?, ?, ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      [id, normalizedEmail, passwordHash],
    );
    await query(
      "INSERT INTO profiles (id, user_id, full_name, email, institution, academic_level, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      [crypto.randomUUID(), id, metadata.full_name || "User", normalizedEmail, metadata.institution || null, metadata.academic_level || null],
    );
    await query(
      "INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, 'user', CURRENT_TIMESTAMP)",
      [crypto.randomUUID(), id],
    );

    const user = { id, email: normalizedEmail, role: "user" as const, full_name: metadata.full_name || "User" };
    res.status(201).json({
      user: publicUser({ ...user, ...metadata }),
      session: {
        access_token: issueToken(user),
        user: publicUser({ ...user, ...metadata }),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Admin sign-up ────────────────────────────────────────────────────────────
// Accepts EITHER:
//  (a) ADMIN_SIGNUP_SECRET in the request body `secret` field, OR
//  (b) A valid admin JWT token in the Authorization header

router.post("/admin-signup", strictLimiter, async (req, res, next) => {
  try {
    const { email, password, full_name, secret } = req.body ?? {};

    // Allow existing admins (via JWT) to create new admins without needing the secret
    const authUser = readAuth(req);
    const hasAdminToken = authUser?.role === "admin";
    const adminSecret = process.env.ADMIN_SIGNUP_SECRET;

    if (!hasAdminToken && (!adminSecret || !secret || secret !== adminSecret)) {
      res.status(403).json({ error: "Invalid admin signup secret" });
      return;
    }

    if (!email || !password || password.length < 6) {
      res.status(400).json({ error: "Email and a password of at least 6 characters are required" });
      return;
    }

    const existing = await query<any[]>("SELECT id FROM users WHERE email = ? LIMIT 1", [email.toLowerCase()]);
    if (existing.length) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const id = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    await query(
      "INSERT INTO users (id, email, password_hash, email_verified, created_at, updated_at) VALUES (?, ?, ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      [id, email.toLowerCase(), passwordHash],
    );
    await query(
      "INSERT INTO profiles (id, user_id, full_name, email, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      [crypto.randomUUID(), id, full_name || "Admin", email.toLowerCase()],
    );
    await query(
      "INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, 'admin', CURRENT_TIMESTAMP)",
      [crypto.randomUUID(), id],
    );

    const user = { id, email: email.toLowerCase(), role: "admin" as const, full_name: full_name || "Admin" };
    res.status(201).json({
      user: publicUser(user),
      session: {
        access_token: issueToken(user),
        user: publicUser(user),
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Sign-in ─────────────────────────────────────────────────────────────────

router.post("/signin", strictLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const rows = await query<any[]>(
      `SELECT u.*, COALESCE(p.full_name, 'User') AS full_name, p.institution, p.academic_level,
              COALESCE(ur.role, 'user') AS role
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.email = ? LIMIT 1`,
      [normalizedEmail],
    );
    const row = rows[0];
    if (!row || !(await bcrypt.compare(password || "", row.password_hash))) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    // Email verification is disabled — all accounts can sign in immediately.
    const user = { id: row.id, email: row.email, role: row.role, full_name: row.full_name };
    const access_token = issueToken(user);
    res.json({ user: publicUser(row), session: { access_token, user: publicUser(row) } });
  } catch (err) {
    next(err);
  }
});

// ─── Session ─────────────────────────────────────────────────────────────────

router.get("/session", optionalAuth, async (req, res, next) => {
  try {
    if (!req.authUser) {
      res.json({ session: null });
      return;
    }
    const rows = await query<any[]>(
      "SELECT u.*, p.full_name, p.institution, p.academic_level FROM users u LEFT JOIN profiles p ON p.user_id = u.id WHERE u.id = ? LIMIT 1",
      [req.authUser.id],
    );
    if (!rows[0]) {
      res.json({ session: null });
      return;
    }
    const user = publicUser(rows[0]);
    res.json({ session: { access_token: req.get("authorization")?.slice(7), user } });
  } catch (err) {
    next(err);
  }
});

// ─── Me ──────────────────────────────────────────────────────────────────────

router.get("/me", optionalAuth, async (req, res) => {
  if (!req.authUser) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const rows = await query<any[]>(
    "SELECT p.*, COALESCE(ur.role, 'user') AS role FROM profiles p LEFT JOIN user_roles ur ON ur.user_id = p.user_id WHERE p.user_id = ? LIMIT 1",
    [req.authUser.id],
  );
  res.json({ profile: rows[0] || null, role: req.authUser.role });
});

// ─── Change password ──────────────────────────────────────────────────────────

router.post("/password", optionalAuth, async (req, res, next) => {
  try {
    if (!req.authUser) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const { password } = req.body ?? {};
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }
    const hash = await bcrypt.hash(password, 12);
    await query("UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [hash, req.authUser.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Forgot / reset password (OTP-based) ─────────────────────────────────────

/**
 * Step 1: POST { email }
 *   → Generates a 6-digit OTP, stores its hash in auth_tokens, returns the
 *     OTP directly so the frontend can display it to the user on-screen.
 *
 * Step 2: POST { email, otp, password }
 *   → Validates the OTP for that user, hashes and saves the new password,
 *     marks the token used.
 */
router.post("/reset-password", looseLimiter, async (req, res, next) => {
  try {
    const { email, otp, password } = req.body ?? {};

    // ── Step 2: verify OTP and set new password ───────────────────────────
    if (email && otp && password) {
      if (typeof password !== "string" || password.length < 8) {
        res.status(400).json({ error: "Password must be at least 8 characters" });
        return;
      }

      const normalEmail = String(email).toLowerCase().trim();
      const users = await query<any[]>(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [normalEmail],
      );
      if (!users[0]) {
        res.status(400).json({ error: "Invalid or expired code" });
        return;
      }

      const otpHash = crypto.createHash("sha256").update(String(otp).trim()).digest("hex");
      const tokenRows = await query<any[]>(
        `SELECT id FROM auth_tokens
         WHERE user_id = ? AND token_hash = ? AND token_type = 'password_reset'
           AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL
         LIMIT 1`,
        [users[0].id, otpHash],
      );
      if (!tokenRows[0]) {
        res.status(400).json({ error: "Invalid or expired code" });
        return;
      }

      const hash = await bcrypt.hash(password, 12);
      await query(
        "UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
        [hash, users[0].id],
      );
      await query(
        "UPDATE auth_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?",
        [tokenRows[0].id],
      );
      res.json({ success: true });
      return;
    }

    // ── Step 1: generate and return OTP ──────────────────────────────────
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const normalEmail = String(email).toLowerCase().trim();
    const users = await query<any[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [normalEmail],
    );

    if (!users[0]) {
      // Don't reveal whether the email exists — but we need to return an OTP
      // only for real users. Return a generic success with no otp field.
      res.json({ success: true });
      return;
    }

    // Generate a 6-digit numeric OTP
    const rawOtp = String(Math.floor(100000 + Math.random() * 900000));
    const otpHash = crypto.createHash("sha256").update(rawOtp).digest("hex");

    // Invalidate any prior unused reset tokens for this user
    await query(
      "UPDATE auth_tokens SET used_at = CURRENT_TIMESTAMP WHERE user_id = ? AND token_type = 'password_reset' AND used_at IS NULL",
      [users[0].id],
    );

    // Store hashed OTP — expires in 15 minutes
    await query(
      `INSERT INTO auth_tokens (id, user_id, token_hash, token_type, expires_at, created_at)
       VALUES (?, ?, ?, 'password_reset', NOW() + INTERVAL '15 minutes', CURRENT_TIMESTAMP)`,
      [crypto.randomUUID(), users[0].id, otpHash],
    );

    console.info("[auth] Password reset OTP generated for:", normalEmail);

    // Return the OTP directly so the frontend can display it on-screen
    res.json({ success: true, otp: rawOtp });
  } catch (err) {
    next(err);
  }
});

// ─── Email verification ───────────────────────────────────────────────────────

router.post("/verify-email", async (req, res, next) => {
  try {
    const tokenHash = crypto.createHash("sha256").update(String(req.body?.token || "")).digest("hex");
    const rows = await query<any[]>(
      "SELECT id, user_id FROM auth_tokens WHERE token_hash = ? AND token_type = 'email_verification' AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL LIMIT 1",
      [tokenHash],
    );
    if (!rows[0]) {
      res.status(400).json({ error: "Verification link is invalid or expired" });
      return;
    }
    await query("UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [rows[0].user_id]);
    await query("UPDATE auth_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?", [rows[0].id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.get("/verify-email", async (req, res, next) => {
  try {
    const token = String(req.query.token || "");
    const origin = process.env.FRONTEND_URL || process.env.APP_ORIGIN || "http://localhost";
    if (!token) {
      res.redirect(`${origin}/verify-email?status=invalid`);
      return;
    }
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const rows = await query<any[]>(
      "SELECT id, user_id FROM auth_tokens WHERE token_hash = ? AND token_type = 'email_verification' AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL LIMIT 1",
      [tokenHash],
    );
    if (!rows[0]) {
      res.redirect(`${origin}/verify-email?status=invalid`);
      return;
    }
    await query("UPDATE users SET email_verified = true, updated_at = CURRENT_TIMESTAMP WHERE id = ?", [rows[0].user_id]);
    await query("UPDATE auth_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?", [rows[0].id]);
    res.redirect(`${origin}/verify-email?status=success`);
  } catch (err) {
    next(err);
  }
});

router.post("/resend-verification", looseLimiter, async (req, res, next) => {
  try {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }
    const users = await query<any[]>(
      "SELECT id, email_verified FROM users WHERE email = ? LIMIT 1",
      [String(email).toLowerCase()],
    );
    if (users[0] && !users[0].email_verified) {
      const rawToken = await issueVerificationToken(users[0].id);
      const origin = process.env.FRONTEND_URL || process.env.APP_ORIGIN || "http://localhost";
      const link = `${origin}/verify-email?token=${rawToken}`;
      if (process.env.SMTP_HOST) {
        await sendMail(
          String(email).toLowerCase(),
          "Verify your NUASA account",
          `Please verify your email:\n\n${link}\n\nThis link expires in 24 hours.`,
          `<p>Please verify your NUASA account: <a href="${link}">Verify Email</a></p><p>This link expires in 24 hours.</p>`,
        );
      } else {
        console.info("[auth] Resend verification token (no SMTP):", rawToken);
      }
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ─── Admin: delete a user ─────────────────────────────────────────────────────

router.delete("/users/:id", async (req, res, next) => {
  try {
    const authUser = readAuth(req);
    if (!authUser || authUser.role !== "admin") {
      res.status(403).json({ error: "Administrator access required" });
      return;
    }
    const targetId = req.params.id;
    if (!targetId) {
      res.status(400).json({ error: "User ID is required" });
      return;
    }
    if (targetId === authUser.id) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    // The admin users list returns COALESCE(u.id, cr.id) as the row id.
    // First look up the actual users.id — fall back to treating targetId as
    // a convention_registrations.id when no user row is found.
    const userRows = await query<{ id: string }[]>(
      "SELECT id FROM users WHERE id = ? LIMIT 1",
      [targetId],
    );

    if (userRows.length > 0) {
      // Full user account — delete all associated data then the user row.
      // user_roles, profiles, and auth_tokens cascade on DELETE in the FK
      // definition, but we delete explicitly for safety.
      await query("UPDATE blog_posts SET author_id = NULL WHERE author_id = ?", [targetId]);
      await query("UPDATE library_resources SET author_id = NULL WHERE author_id = ?", [targetId]);
      await query("DELETE FROM auth_tokens WHERE user_id = ?", [targetId]);
      await query("DELETE FROM saved_posts WHERE user_id = ?", [targetId]);
      await query("DELETE FROM saved_resources WHERE user_id = ?", [targetId]);
      await query("DELETE FROM post_views WHERE user_id = ?", [targetId]);
      await query("DELETE FROM resource_views WHERE user_id = ?", [targetId]);
      await query("DELETE FROM resource_downloads WHERE user_id = ?", [targetId]);
      await query("DELETE FROM convention_registrations WHERE user_id = ?", [targetId]);
      await query("DELETE FROM admin_login_log WHERE user_id = ?", [targetId]);
      await query("DELETE FROM user_roles WHERE user_id = ?", [targetId]);
      await query("DELETE FROM profiles WHERE user_id = ?", [targetId]);
      await query("DELETE FROM users WHERE id = ?", [targetId]);
    } else {
      // Convention-only registrant with no user account — targetId is the
      // convention_registrations.id.  Just delete the registration row.
      const crRows = await query<{ id: string }[]>(
        "SELECT id FROM convention_registrations WHERE id = ? LIMIT 1",
        [targetId],
      );
      if (!crRows.length) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      await query("DELETE FROM convention_registrations WHERE id = ?", [targetId]);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;

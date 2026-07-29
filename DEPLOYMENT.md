# Deploying NUASA to cPanel

This covers hosting the Express API + React frontend on a cPanel account
that has **Setup Node.js App** (CloudLinux's Node.js Selector, backed by
Phusion Passenger) under Software.

## Architecture

Two independently deployed pieces, on two subdomains of the same cPanel
account:

| Piece | Where | How it's served |
|---|---|---|
| API (`artifacts/api-server`) | `api.yourdomain.com` | cPanel Node.js app (Passenger manages the process) |
| Frontend (`artifacts/nuasa`) | `yourdomain.com` | Static files in `public_html/`, served by Apache — no Node involved |
| MySQL | `localhost` | cPanel's built-in MySQL, same account |

The frontend is a static Vite build — it has no server of its own. It calls
the API via an **absolute URL** baked in at build time
(`VITE_API_URL=https://api.yourdomain.com/api`), and the API's CORS is
deliberately open (`origin: "*"`, see `app.ts`) so that cross-subdomain call
is allowed. This two-subdomain split avoids a real ambiguity with mounting
a Node app at a *sub-path* of the same domain (whether Passenger strips the
path prefix before forwarding varies by setup) — a separate subdomain has
no such ambiguity, and behaves exactly like local dev.

## What actually starts the app (read this if `/` looks broken)

cPanel's Node.js Selector is a UI on top of **Phusion Passenger**. When you
configure a Node.js app, Passenger runs `node <Application startup file>`
as a long-lived managed process — comparable to what `pm2` or `systemd`
would do, except cPanel/Passenger handles it for you: it starts the app,
restarts it if it crashes, and injects a `PORT` env var that your code must
listen on (`index.ts` already does — `process.env["PORT"]`, and throws if
it's missing, which is intentional: if the app dies immediately, that's
usually why — see the "won't start" row in Troubleshooting below).

You do **not** run `npm start` or `node dist/index.mjs` yourself over SSH
for a production Node.js Selector app — Passenger owns the process
lifecycle. The controls are all in cPanel: **Start / Stop / Restart** on the
Node.js App page.

**"Cannot GET /" at `https://api.yourdomain.com/` is expected, not
broken** — every real route in this API lives under `/api`
(`app.use("/api", router)` in `app.ts`), there's nothing at the bare root.
Seeing "Cannot GET /" actually *proves* the Node process is up and Express
is answering requests — it just has no route for that exact path. The
right sanity check is `https://api.yourdomain.com/api/healthz`, which
should return `{"status":"ok"}`. As of this deploy, the bare root also
returns a small JSON status message instead of Express's default 404, so a
fresh deploy is easier to eyeball.

## Step-by-step

### 1. Database
- cPanel → **MySQL Database Wizard**: create a database + user (cPanel
  prefixes both with your username, e.g. `cpaneluser_nuasa` /
  `cpaneluser_dbuser`), grant the user **All Privileges** on it.
- cPanel → **phpMyAdmin** → select the database → **Import** →
  `database.sql` from the repo root.

### 2. Backend
On your machine:
```bash
pnpm --filter nuasa-api-server run build
```
This produces `artifacts/api-server/dist/index.mjs` — one bundled file.
`mysql2`, `nodemailer`, and **`sharp`** are deliberately excluded from the
bundle (see `build.mjs`'s `external` list) and loaded from `node_modules`
at runtime instead — `sharp` in particular ships a native binary compiled
for a specific OS/CPU, so your local (e.g. macOS) copy will not run on
cPanel's Linux server. cPanel has to install it itself (step below).

Upload to a folder **outside** `public_html`, e.g. `~/nuasa-api/`.
Exclude `node_modules` and `src` — you only need:
- `dist/index.mjs`
- `package.json`, `package-lock.json`

In cPanel → **Setup Node.js App**:
- Node.js version: 20.x
- Application mode: Production
- Application root: `nuasa-api`
- Application URL: `api.yourdomain.com`
- Application startup file: `dist/index.mjs`
- Environment variables (do **not** set `PORT` — Passenger injects it):
  ```
  NODE_ENV=production
  DB_HOST=localhost
  DB_PORT=3306
  DB_NAME=cpaneluser_nuasa
  DB_USER=cpaneluser_dbuser
  DB_PASSWORD=<from step 1>
  JWT_SECRET=<generate fresh, 32+ chars>
  ADMIN_SIGNUP_SECRET=<generate fresh, 32+ chars, different from JWT_SECRET>
  FRONTEND_URL=https://yourdomain.com
  UPLOAD_DIR=/home/cpaneluser/nuasa-uploads
  SMTP_HOST=...
  SMTP_PORT=587
  SMTP_USER=...
  SMTP_PASSWORD=...
  FLUTTERWAVE_PUBLIC_KEY=...
  ```
  Generate secrets with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Run it twice — `JWT_SECRET` and `ADMIN_SIGNUP_SECRET` must be different
  values. Never reuse the `nuasanationaladminsecret` string from this
  project's git history — that one is burned (see `FIX_TRACKER.md`, FIX-1).
- Create `~/nuasa-uploads` (File Manager → new folder) **before** starting
  the app — keeping it outside `nuasa-api/` means redeploying (overwriting
  `dist/index.mjs`) never wipes uploaded files.
- Click **Run NPM Install** (installs `sharp` etc. correctly for the
  server's actual architecture — this is the step that makes uploads/image
  compression work).
- **Start** the app.
- Check `https://api.yourdomain.com/api/healthz`.

### 3. Frontend
```bash
VITE_API_URL=https://api.yourdomain.com/api pnpm --filter @workspace/nuasa run build
```
Upload the **contents** of `artifacts/nuasa/dist/` into `public_html/`.

Add `public_html/.htaccess` so client-side routes survive a refresh:
```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

### 4. SSL
cPanel → **SSL/TLS Status** → run **AutoSSL** for both `yourdomain.com` and
`api.yourdomain.com` (free). `VITE_API_URL` must use `https://` — mixed
http/https will get silently blocked by the browser.

### 5. Smoke test
- `https://api.yourdomain.com/api/healthz` → `{"status":"ok"}`
- `https://yourdomain.com` loads, register an account, verify email (check
  spam if `SMTP_HOST` is set; check the API's error log in cPanel if not),
  sign in, try an admin action, try an upload.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Cannot GET /` at `api.yourdomain.com/` | Nothing — expected, see above | Check `/api/healthz` instead. If you want the friendlier root response, redeploy after pulling the latest `app.ts`. |
| App won't start / cPanel shows a red "stopped" state right after Start | `JWT_SECRET` or `ADMIN_SIGNUP_SECRET` missing or under 32 characters — `lib/env.ts` throws on purpose (see FIX-3) | Open the Node.js app's **Errors** log (or `stderr.log` in the app root) — it'll say exactly which var is the problem. Fix the value in cPanel's Environment Variables section, Restart. |
| 502 / 503 Bad Gateway | The Node process crashed after starting | Check the error log. Most common cause here is a DB connection failure (next row) or a typo'd env var. |
| `ECONNREFUSED` / `ER_ACCESS_DENIED` in the error log | Wrong `DB_HOST`, `DB_USER`, `DB_NAME`, or `DB_PASSWORD` — remember cPanel prefixes DB/user names with your cPanel username | Double-check the exact names shown in cPanel → MySQL Databases (not what's in `.env.example`). `DB_HOST` should be `localhost`. |
| `sharp` install fails, or errors like "Could not load the sharp module using the linux-x64 runtime" | Uploaded a local (e.g. macOS) `node_modules/sharp` instead of letting the server build it, or **Run NPM Install** wasn't clicked after the last upload | Delete `node_modules` in the app root via File Manager, re-run **Run NPM Install** from the Node.js App page (not manually via SSH npm unless you're sure it's using the same Node version cPanel configured). |
| Uploads fail with a permissions or "ENOENT" error | `UPLOAD_DIR` points to a folder that doesn't exist or isn't writable | Create the folder via File Manager first, confirm the path in the env var matches exactly (absolute path, no trailing slash issues), Restart. |
| Browser console shows a CORS error despite `origin: "*"` in `app.ts` | The frontend was built *before* `VITE_API_URL` was set, or wasn't rebuilt after changing it — Vite bakes env vars in at **build** time, not runtime | Rebuild with `VITE_API_URL=https://api.yourdomain.com/api pnpm --filter @workspace/nuasa run build` and re-upload `dist/`. Editing the already-built files in `public_html` won't work — the URL is compiled into the JS bundle. |
| Refreshing a frontend route like `/login` or `/library/3` gives an Apache 404 | Missing or wrong `.htaccess` in `public_html` | Add the rewrite rule from step 3 above. |
| "Mixed content" warning / requests silently fail | `VITE_API_URL` uses `http://` while the site is on `https://`, or `api.yourdomain.com` doesn't have SSL yet | Issue AutoSSL for the subdomain, use `https://` in `VITE_API_URL`, rebuild the frontend. |
| Verification/reset emails never arrive, no error shown | `SMTP_HOST` unset (signup still succeeds — see `routes/auth.ts`, tokens are only logged to console, which cPanel doesn't show you in prod) or wrong SMTP credentials | Set real `SMTP_*` env vars (cPanel → Email Accounts can give you a `mail.yourdomain.com` account), Restart, check the app's error log for SMTP auth failures. |
| Changes don't show up after redeploying | Passenger is still running the old process | Click **Restart** on the Node.js App page after every upload — it does not auto-detect new files. |
| `npm install` (Run NPM Install) itself fails with compiler errors | Rare, but some hosts lack build tools for a from-source native compile if no prebuilt `sharp` binary matches their exact platform | Contact your host about available build tools, or as a last resort ask me to make image compression optional/skippable via an env flag so the app can run without `sharp`. |

## Redeploying after a code change

- **API**: rebuild (`pnpm --filter nuasa-api-server run build`),
  re-upload `dist/index.mjs`, click **Restart** in the Node.js App page. If
  `package.json` changed (new/removed dependency), re-run **Run NPM
  Install** first.
- **Frontend**: rebuild with the same `VITE_API_URL`, re-upload the
  contents of `dist/` into `public_html/`, overwriting the old files. No
  restart needed — Apache serves static files directly.

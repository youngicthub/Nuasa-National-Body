# NUASA — Security & Code Fix Tracker

Generated from a full-repo review on 2026-07-28. Each item has a status,
severity, the exact files involved, and a concrete spec for what the fix
looks like. Nothing below has been implemented yet except FIX-1a — this is
the plan to review before I start changing code.

**Status legend:** `TODO` not started · `PARTIAL` some part done · `DONE`

**Severity legend:** `CRITICAL` exploitable now, real data/funds/accounts at
risk · `HIGH` exploitable, narrower blast radius · `MEDIUM` hardening ·
`LOW` cleanup / consistency

---

## FIX-1 — Leaked secrets in git history [CRITICAL] — `PARTIAL` (owner: acceptable risk per user, 2026-07-28)

> User call: DB/SMTP/Flutterwave keys judged safe as-is — no further rotation
> requested for those. `.env` app-secret rotation (FIX-1a) stands.

**Problem:** `.replit` (tracked, pushed to `origin/main` on GitHub) contains
real `DB_PASSWORD`, `SMTP_PASSWORD`, and `JWT_SECRET` = `SESSION_SECRET` =
`ADMIN_SIGNUP_SECRET` = `nuasanationaladminsecret` (all three identical).

**Done (FIX-1a):** Created `.env` (git-ignored) at repo root with:
- Freshly generated, distinct `JWT_SECRET` and `ADMIN_SIGNUP_SECRET`
  (48-byte / 32-byte hex, generated locally 2026-07-28).
- Dropped `SESSION_SECRET` — confirmed unused anywhere in the codebase.
- Your existing DB/SMTP/Flutterwave-public values, carried over as-is.

**Still TODO (needs your action outside this repo, I can't do these for you):**
1. Change the MySQL password for `DB_USER` in your MySQL server, then update
   `DB_PASSWORD` in `.env`.
2. Rotate the SMTP account password (`info@nuasanational.com.ng`) at your
   email provider, then update `SMTP_PASSWORD` in `.env`. Treat this mailbox
   as potentially compromised until then.
3. Regenerate the Flutterwave secret/encryption keys in the Flutterwave
   dashboard (the *public* key is safe to leave, only secret/encryption keys
   matter here) — needed regardless because of FIX-2 below.
4. Replace the real values in `.replit`'s `[userenv.shared]` block with
   placeholders (or move them to Replit's Secrets panel), commit, and push.
   Rotating the values makes the already-committed ones harmless, but the
   file itself should stop holding live secrets going forward.
5. Add `.env` to `.gitignore` explicitly if you rename it (it's currently
   covered by the existing `.env` / `.env.local` / `.env.*.local` rules —
   just confirmed, no change needed there).

---

## FIX-2 — Broken access control on `/api/data/:table` [CRITICAL] — `DONE` (2026-07-28)

**Implemented** in [`local-data.ts`](artifacts/api-server/src/routes/local-data.ts)
per the plan below: added `ADMIN_WRITE_TABLES` (14 tables: `users`,
`user_roles`, `app_settings`, `admin_login_log`, `site_visits`, plus the 8
content tables previously public-read-only) and `OWNED_TABLES` (7 tables:
`profiles`, `saved_posts`, `saved_resources`, `resource_views`,
`resource_downloads`, `post_views`, `convention_registrations`, each keyed to
`user_id`). Every verb now checks the table's category before touching the
DB:
- `GET`: public tables unchanged; owned tables force a `user_id = caller`
  filter for non-admins; everything else requires `role = admin`.
- `POST`: admin-write tables require `role = admin`; owned tables have their
  owner column force-set to the caller's own id (previously a client could
  pass an arbitrary `user_id` in the body — fixed as a side effect, not just
  `convention_registrations` anymore).
- `PATCH`/`DELETE`: admin-write tables require `role = admin`; owned tables
  get a forced `user_id = caller` filter appended so non-admins can only
  ever affect their own rows, regardless of the filter they passed.
- Also caught a bonus bug along the way: `profiles` wasn't in either bucket
  before, so any authenticated user could have edited any other user's
  profile via `PATCH /api/data/profiles?user_id=eq.<other>` — now owned.

**Not run:** typecheck (`pnpm --filter @workspace/api-server run typecheck`)
— no `node_modules` installed in this environment and no network access to
fetch `tsc`. Please run it (and a manual smoke test of admin pages —
AdminUsers role toggle, AdminSettings, AdminCategories/Events/Executives
editors, and a regular user's dashboard/saved-resources) before deploying.

<details><summary>Original plan (implemented as described)</summary>

**File:** [`artifacts/api-server/src/routes/local-data.ts`](artifacts/api-server/src/routes/local-data.ts)

**Problem:** `GET`/`POST`/`PATCH`/`DELETE` on the generic table endpoint only
check `ensureAuth` (any logged-in user). No role check, no ownership check
except two special-cased branches for `convention_registrations`. Any
registered user can grant themselves admin via
`POST /api/data/user_roles {user_id, role:"admin"}`, read `users.password_hash`
for everyone, read/rewrite `app_settings` (Flutterwave secret key), or
delete arbitrary rows in `blog_posts`/`events`/`executives`/etc.

**Planned fix — a per-table access policy, enforced centrally in
`local-data.ts` before the query runs:**

```ts
// Tables where only admins may write (insert/update/delete).
// Reads may still be broader — see per-verb rules below.
const ADMIN_WRITE_TABLES = new Set([
  "users", "user_roles", "app_settings", "admin_login_log",
  "categories", "tags", "blog_posts", "blog_post_tags",
  "library_resources", "library_resource_tags", "chapters",
  "events", "executives",
]);

// Tables where a row belongs to a user (own-row read/write only,
// column name given). Not admin-writable via this generic route.
const OWNED_TABLES: Record<string, string> = {
  saved_posts: "user_id",
  saved_resources: "user_id",
  resource_views: "user_id",
  resource_downloads: "user_id",
  post_views: "user_id",
  convention_registrations: "user_id", // already partially handled
};
```

- `GET`: keep existing `PUBLIC_TABLES` passthrough. For everything else:
  if table is in `OWNED_TABLES`, force-inject a `user_id = req.authUser.id`
  filter unless `req.authUser.role === "admin"` (already done for
  `convention_registrations`; generalize it). Otherwise (not owned, not
  public) require `requireAdmin`.
- `POST`/`PATCH`/`DELETE`: if table is in `ADMIN_WRITE_TABLES`, require
  `req.authUser.role === "admin"`. If table is in `OWNED_TABLES`, require the
  filter (`PATCH`/`DELETE`) or inserted row (`POST`) to reference the
  caller's own `user_id` unless admin. `ANON_INSERT_TABLES` stays as-is.
- Return `403` (not a silent empty result) when a non-admin targets an
  admin-write table, so the frontend surfaces a clear error instead of a
  confusing no-op.

This keeps the generic-table pattern (avoids rewriting every admin page) but
puts a real authorization gate in front of it. `admin.ts`'s
`requireAdmin`-gated routes are unaffected.

</details>

---

## FIX-3 — JWT signing falls back to a hardcoded default secret [HIGH] — `DONE` (2026-07-28)

**File:** [`artifacts/api-server/src/middleware/auth.ts`](artifacts/api-server/src/middleware/auth.ts),
[`artifacts/api-server/src/index.ts`](artifacts/api-server/src/index.ts),
new [`artifacts/api-server/src/lib/env.ts`](artifacts/api-server/src/lib/env.ts)

**Implemented:** `lib/env.ts` exports `assertRequiredEnv()`, called as the
first line of `index.ts` before the server binds a port. It throws unless
`JWT_SECRET` and `ADMIN_SIGNUP_SECRET` are both set and ≥32 characters —
same failure mode as the existing `PORT` check, so a misconfigured deploy
now refuses to start instead of silently running insecurely. The hardcoded
`"nuasa-local-development-secret"` fallback in `auth.ts`'s `secret()` is
gone — it now throws if `JWT_SECRET` is somehow missing at call time
(defense-in-depth for anything importing the module outside `index.ts`'s
boot path). Also updated `.env.example` to include `ADMIN_SIGNUP_SECRET`
(previously missing from the example file entirely) and dropped the unused
`SESSION_SECRET` line (see FIX-8).

**Not run:** typecheck, same environment limitation as FIX-2.

---

## FIX-4 — No rate limiting on auth endpoints [MEDIUM] — `DONE` (2026-07-28)

**File:** [`artifacts/api-server/src/routes/auth.ts`](artifacts/api-server/src/routes/auth.ts),
[`artifacts/api-server/src/app.ts`](artifacts/api-server/src/app.ts)

**Implemented:** added `express-rate-limit` as a dependency. Two limiters:
- `strictLimiter` (10 req / 15 min per IP) on `/signin` and `/admin-signup`
  (the latter guards a secret-guessing target, not just login).
- `looseLimiter` (5 req / hour per IP) on `/signup`, `/reset-password`,
  `/resend-verification` — mainly to stop mailbox-bombing / signup spam.

Also added `app.set("trust proxy", 1)` in `app.ts`: without it, every
request behind Replit's (or any) reverse proxy looks like it comes from the
same address, which would either rate-limit all users together or trip
express-rate-limit's own proxy-misconfiguration validation.

**Not run:** typecheck, and `pnpm install` hasn't been run to actually fetch
`express-rate-limit` — no network access in this environment. Run
`pnpm install` before starting the server or the new import will fail to
resolve.

---

## FIX-5 — Unrestricted file uploads [MEDIUM] — `TODO`

**File:** [`artifacts/api-server/src/routes/local-data.ts`](artifacts/api-server/src/routes/local-data.ts) — `DONE` (2026-07-28)

**Problem:** `multer({ dest: uploadDir })` had no `fileFilter` and no
`limits.fileSize`. Files were served back statically, so an uploaded
`.html`/`.svg` with a `<script>` would execute same-origin (stored XSS). No
size cap also allowed trivial disk-fill DoS.

**Implemented:**
- `multer` now has `limits.fileSize = 50MB` (matches the frontend's largest
  existing cap, `ResourceUploadForm`'s 50MB) and a `fileFilter` allowlist
  covering exactly what the frontend actually uploads: JPEG/PNG/GIF/WebP
  images, PDF, and Word/PowerPoint/Excel (both legacy and OOXML MIME types).
  `image/svg+xml` is deliberately **excluded** even though the frontend's
  `ImageUpload.tsx` used to offer it — SVG can embed `<script>` and would
  execute same-origin once served back. Synced that component's client-side
  allowlist and error copy to match (`ChapterUploadForm.tsx` and
  `ResourceUploadForm.tsx` never allowed SVG in the first place).
- Rejected uploads now surface a real "Unsupported file type: …" error
  (`fileFilter` calls back with an `Error`) instead of a misleading
  generic "File is required."
- Added `X-Content-Type-Options: nosniff` on `GET /api/uploads/:file` so
  even an allowed file can't be MIME-sniffed into executing as something
  else.
- **Removed** a second, redundant static file mount at bare `/uploads` in
  `app.ts` (`express.static(uploadDir)`, no auth/filter/headers at all) —
  grepped the whole frontend and confirmed nothing uses it; every caller
  goes through `/api/uploads/:file` in `local-data.ts`. Having two routes
  serve the same directory meant any hardening only done on one of them
  was incomplete; simplest fix was removing the unused one rather than
  patching both. Dropped the now-unused `path` import in `app.ts` too.

**Not run:** typecheck, same environment limitation as FIX-2–4.

---

## FIX-6 — CORS wide open [LOW] — `DONE` (2026-07-28, kept intentionally open)

**User decision:** keep CORS open to all origins — explicitly, not by
accident. Originally planned to restrict to `FRONTEND_URL`; user opted to
keep `*` instead.

**File:** [`artifacts/api-server/src/app.ts`](artifacts/api-server/src/app.ts)

**Implemented:** `app.use(cors())` (implicit default) → `app.use(cors({ origin: "*", credentials: false }))`
— functionally the same permissiveness as before, but now a documented,
deliberate choice instead of an unexamined default. `credentials: false` is
pinned explicitly so this stays safe even if a future cookie-based auth
flow gets added — CORS `*` + credentials is the combination that's actually
dangerous, and the browser rejects it outright anyway (`*` is invalid when
credentials are allowed), so pinning it now documents the constraint rather
than relying on that rejection as a silent guardrail.

---

## FIX-7 — Email verification not enforced at sign-in [LOW] — `DONE` (2026-07-28)

**User decision:** enforce it.

**Backend** ([`routes/auth.ts`](artifacts/api-server/src/routes/auth.ts)):
`POST /auth/signin` now returns `403 { error: "...", code: "EMAIL_NOT_VERIFIED" }`
when `users.email_verified` is falsy, checked right after the password
compare (so it never leaks whether an email exists ahead of a correct
password). Admin accounts created via `/admin-signup` are unaffected — that
route already sets `email_verified = 1` at creation time.

**Turned up a real gap while implementing this:** the verification emails
sent by `/signup` link to `${FRONTEND_URL}/verify-email?token=...`, but
**no `/verify-email` route existed in the frontend at all** — grepped the
whole app to confirm. Enforcing the gate without fixing this would have
permanently locked out any signed-out unverified user (valid link, nowhere
to land; no resend UI anywhere either). Built the missing piece:
- New page [`pages/VerifyEmail.tsx`](artifacts/nuasa/src/pages/VerifyEmail.tsx),
  registered at `/verify-email` in [`App.tsx`](artifacts/nuasa/src/App.tsx).
  Reads `?token=`, calls the (new) `supabase.auth.verifyEmail()` shim
  method, shows success/error state, and — on failure or a missing token —
  offers a "resend verification email" form.
- Two new methods on the `client.ts` compatibility shim's `auth` object:
  `verifyEmail(token)` → `POST /auth/verify-email`, `resendVerification(email)`
  → `POST /auth/resend-verification` (both endpoints already existed
  server-side, just weren't called from anywhere in the frontend).
- `request()` in `client.ts` now attaches `code`/`status` onto the thrown
  `Error` (new `ApiError` type) instead of losing everything but the
  message string — needed so the UI can tell "wrong password" apart from
  "not verified" and react differently.
- `Login.tsx` and `AdminLogin.tsx`: on `EMAIL_NOT_VERIFIED`, show a toast
  with a "Resend email" action button instead of a dead-end error.
- `Register.tsx`: success toast now mentions checking email, since
  verification is no longer purely cosmetic.

**Known scope boundary, not a bug:** this only gates `/signin`. `/signup`
and `/admin-signup` still issue a session token immediately on account
creation (pre-existing behavior, unchanged), so a freshly-registered user
is logged in right away regardless of verification status — the gate only
applies the next time they'd need to log back in. Flagging in case that's
not the intended product behavior; closing this loophole too (e.g. not
auto-logging in after signup) would be a separate, bigger UX change.

**Not run:** `pnpm install` + typecheck, same environment limitation as
everything else above.

---

## FIX-8 — Dead code / config cleanup [LOW] — `DONE` (2026-07-28)

- **Deleted `lib/db/` entirely** (not just the dependency) — turned out to
  be worse than "unused": `drizzle.config.ts` was configured for
  `dialect: "postgresql"` and required a `DATABASE_URL` env var that exists
  nowhere in this app (which runs MySQL via `DB_HOST`/`DB_NAME`/etc.), and
  `schema/index.ts` was an empty template with no real schema in it. Pure
  leftover scaffolding, actively misleading if anyone went looking for the
  "real" DB layer. Removed the `./lib/db` project reference from the root
  [`tsconfig.json`](tsconfig.json) too.
- Removed `drizzle-orm` from `artifacts/api-server/package.json` — unused,
  the API server talks to MySQL directly via `mysql2`
  ([`lib/db.ts`](artifacts/api-server/src/lib/db.ts)).
- **Bonus find**: `cookie-parser` (+ `@types/cookie-parser`) was also an
  unused dependency in `artifacts/api-server/package.json` — grepped, never
  imported or wired into `app.ts`. Makes sense given auth is entirely
  Bearer-token based, no cookies parsed anywhere. Removed both.
- Removed `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` from
  `.replit`'s `[userenv.shared]` block — confirmed via grep that nothing in
  the frontend or backend references them; the `supabase` import is purely
  the local shim in `client.ts` and never talks to real Supabase. (Left
  `JWT_SECRET`/`ADMIN_SIGNUP_SECRET`/`DB_PASSWORD`/`SMTP_PASSWORD` in that
  same file untouched — that's the FIX-1 rotation question, already closed
  per your call, not part of this cleanup.)
- `SESSION_SECRET` — already removed from `.env.example` as part of FIX-3.

**Not run:** `pnpm install` (to update the lockfile after removing
`drizzle-orm`/`cookie-parser`) + typecheck, same limitation as everything
above.

---

## FIX-9 — Inconsistent local-dev env filename [LOW] — `DONE` (2026-07-28)

**Files:** [`scripts/start-api-local.sh`](scripts/start-api-local.sh),
[`.env.example`](.env.example)

**Implemented:** standardized both scripts on `.env` (matching the primary
`start-local.sh` flow and what FIX-1 already created).
`start-api-local.sh`'s `ENV_FILE` now points at `../.env` instead of
`../.env.local`, and `.env.example`'s header comment says `.env` too.
Grepped the repo afterward for any other `.env.local` references — none
left outside this tracker's own history.

**Caught a real regression while touching this file:** `start-api-local.sh`
had a `JWT_SECRET` fallback default of only 30 characters
(`local-dev-jwt-secret-change-me`) and **no fallback at all** for
`ADMIN_SIGNUP_SECRET`. Since FIX-3 made the server refuse to boot unless
both are ≥32 characters, running this script without your own `.env`
supplying real values would now hard-fail at startup — a regression FIX-3
introduced into this specific script. Fixed both fallbacks to be ≥32
characters (40 and 39 chars respectively) so the script still works
out-of-the-box for a throwaway local DB; also dropped the `SESSION_SECRET`
fallback line since that var is unused (FIX-8).

**Not run:** typecheck n/a here (bash, not TS) — but worth actually running
`bash scripts/start-api-local.sh` once on your end to confirm it boots.

---

## FEATURE-1 — Server-side upload compression [ENHANCEMENT] — `DONE` (2026-07-28)

**Not a security fix** — a feature you requested while FIX-5 was fresh in
context, since it touches the same upload path.

**Files:** new [`artifacts/api-server/src/lib/compress.ts`](artifacts/api-server/src/lib/compress.ts),
wired into [`routes/local-data.ts`](artifacts/api-server/src/routes/local-data.ts)'s
`POST /uploads` handler.

**What it does:** every upload that passes the FIX-5 MIME allowlist is now
run through `maybeCompress()` before being written to disk:
- **Images** (JPEG/PNG/WebP): re-encoded via `sharp` — auto-oriented from
  EXIF then EXIF stripped (also a minor privacy win, e.g. GPS tags in phone
  photos are dropped), downscaled to a 2000px longest side if larger
  (plenty for web display), JPEG at quality 80 with mozjpeg, PNG with max
  compression + palette reduction, WebP at quality 80.
- **PDFs**: re-saved via `pdf-lib` with object-stream compression. This is
  modest compared to a real tool like Ghostscript (not available as a pure
  JS/no-native-binary option), mainly benefiting PDFs with duplicated
  objects — not a full raster-recompression pass.
- **GIF and Office docs** (Word/PowerPoint/Excel) are stored as-is —
  animated GIFs are too easy to break by re-encoding, and Office files are
  already zip-compressed internally with little room left.
- **Never makes a file bigger or blocks an upload**: compares compressed
  size to the original and only swaps in the compressed version if it's
  actually smaller; any compression error is logged and swallowed,
  falling back to storing the original untouched.

**Dependencies added:** `sharp` (already pre-listed as an esbuild `external`
in [`build.mjs:32`](artifacts/api-server/build.mjs#L32), so the build
tooling already anticipated it — safe choice for this environment) and
`pdf-lib` (pure JS, bundles normally).

**Not run:** `pnpm install` (need to fetch the two new packages — `sharp`
in particular pulls a prebuilt native binary for the target platform) and
typecheck, same environment limitation as the other fixes above. Worth a
manual test after installing: upload a large photo and a large PDF through
the admin UI and confirm the stored file in `uploads/` is smaller and still
opens correctly.

---

## Suggested order

1. ~~FIX-1 remaining steps~~ — closed, no further rotation requested.
2. ~~FIX-2 (broken access control)~~ — done, needs typecheck + smoke test.
3. ~~FIX-3 (fail-closed startup secrets)~~ — done.
4. ~~FIX-4 (rate limiting)~~ — done, needs `pnpm install`.
5. ~~FIX-5 (upload validation)~~ — done, needs `pnpm install` + typecheck.
6. ~~FIX-6 (CORS)~~ — done, kept open per your call.
7. ~~FIX-7 (email verification)~~ — done, needs `pnpm install` + typecheck.
8. ~~FIX-8 (dead code cleanup)~~ — done, needs `pnpm install` to refresh lockfile.
9. ~~FIX-9 (env filename consistency)~~ — done.

**All tracked items are now closed.** Before deploying: run `pnpm install`
(new deps: `express-rate-limit`, `sharp`, `pdf-lib`; removed:
`drizzle-orm`, `cookie-parser`), then `pnpm --filter @workspace/api-server
run typecheck`, then smoke-test: admin role toggle (AdminUsers), a regular
user's dashboard/saved-resources, an image + PDF upload through the admin
UI, and the signup → verify-email → sign-in flow end to end. None of this
has been typechecked or run in this environment — see the per-item notes
above for why.

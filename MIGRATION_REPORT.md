# NUASA — Supabase to MySQL Migration Report

## 1. Original Supabase Tables → New MySQL Tables

| Original (PostgreSQL / Supabase auth) | MySQL Table | Notes |
|---|---|---|
| `auth.users` (Supabase managed) | `users` | Custom table with `password_hash`, `email_verified` |
| `public.profiles` | `profiles` | Identical columns |
| `public.user_roles` | `user_roles` | Role stored as VARCHAR (was ENUM) |
| `public.categories` | `categories` | Identical |
| `public.tags` | `tags` | Identical |
| `public.blog_posts` | `blog_posts` | TIMESTAMPTZ → DATETIME, TEXT → LONGTEXT for content |
| `public.blog_post_tags` | `blog_post_tags` | Identical |
| `public.library_resources` | `library_resources` | Identical |
| `public.library_resource_tags` | `library_resource_tags` | Identical |
| `public.chapters` | `chapters` | JSONB → JSON |
| `public.saved_posts` | `saved_posts` | Identical |
| `public.saved_resources` | `saved_resources` | Identical |
| `public.resource_views` | `resource_views` | Identical |
| `public.resource_downloads` | `resource_downloads` | Identical |
| `public.post_views` | `post_views` | Identical |
| `public.site_visits` | `site_visits` | Identical |
| `public.events` | `events` | Identical |
| `public.executives` | `executives` | Identical |
| `public.app_settings` | `app_settings` | `key` column quoted (reserved word in MySQL) |
| `public.convention_registrations` | `convention_registrations` | JSONB → JSON for delegates |
| `public.admin_login_log` | `admin_login_log` | Identical |
| *(new)* | `auth_tokens` | Stores hashed email-verification and password-reset tokens |

### PostgreSQL → MySQL conversions
- `UUID PRIMARY KEY DEFAULT gen_random_uuid()` → `CHAR(36) NOT NULL PRIMARY KEY` (UUIDs generated in Node.js via `crypto.randomUUID()`)
- `TIMESTAMPTZ` → `DATETIME`
- `TEXT` → `TEXT` / `LONGTEXT` (post content)
- `BOOLEAN` → `TINYINT(1)`
- `JSONB` → `JSON`
- `NUMERIC(12,2)` → `DECIMAL(12,2)`
- PostgreSQL triggers for `updated_at` → MySQL `ON UPDATE CURRENT_TIMESTAMP`
- RLS policies → Express middleware (`optionalAuth`, `requireAuth`, `requireAdmin`)

---

## 2. All Preserved API Endpoints

### Auth (`/api/auth/…`)
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/signup` | User registration |
| POST | `/api/auth/admin-signup` | Admin registration (validates `ADMIN_SIGNUP_SECRET` server-side) |
| POST | `/api/auth/signin` | Login — returns JWT |
| GET | `/api/auth/session` | Returns current session from JWT |
| GET | `/api/auth/me` | Returns current user profile and role |
| POST | `/api/auth/password` | Change password (authenticated) |
| POST | `/api/auth/reset-password` | Request reset email OR consume token + set new password |
| GET | `/api/auth/verify-email?token=…` | Verify email via link click (redirects to frontend) |
| POST | `/api/auth/verify-email` | Verify email via API call |
| POST | `/api/auth/resend-verification` | Resend verification email |
| DELETE | `/api/auth/users/:id` | Delete user and all their data (admin only) |

### Public (`/api/…`)
| Method | Path | Description |
|---|---|---|
| GET | `/api/posts` | List published blog posts |
| GET | `/api/posts/:slug` | Single post by slug |
| GET | `/api/posts/:id/tags` | Tags for a post |
| GET | `/api/posts/:id/related` | Related posts by category |
| GET | `/api/categories` | All categories (filterable by `?type=blog\|library`) |
| GET | `/api/tags` | All tags |
| GET | `/api/events` | Published events |
| GET | `/api/chapters` | Active chapters |
| GET | `/api/resources` | Library resources |
| GET | `/api/resources/:id` | Single resource |
| POST | `/api/resources/:id/download` | Increment download count |
| GET | `/api/executives` | Active executives |
| GET | `/api/healthz` | Health check |

### Generic data layer (`/api/data/…`)
Supports all 21 tables with `GET`, `POST`, `PATCH`, `DELETE`. Public tables are readable without auth; all writes require a valid JWT except `site_visits` inserts (anonymous allowed).

### File uploads (`/api/uploads/…`)
| Method | Path | Description |
|---|---|---|
| POST | `/api/uploads` | Upload file (authenticated) |
| GET | `/api/uploads/:file` | Serve uploaded file |

### Functions (compatibility shim)
| Method | Path | Description |
|---|---|---|
| POST | `/api/functions/convention-public-config` | Returns Flutterwave public key |
| POST | `/api/functions/convention-verify-payment` | Payment verification stub |

---

## 3. Supabase Features → Local Replacements

| Supabase Feature | Local Replacement |
|---|---|
| `supabase.auth.*` | Local `supabase` shim in `client.ts` → Express `/api/auth/*` routes |
| `supabase.from(table).*` | Local query builder shim → Express `/api/data/:table` |
| `supabase.storage.from(bucket).*` | Local file storage → `uploads/` directory + `/api/uploads/*` |
| `supabase.functions.invoke(name)` | Local shim → `/api/functions/:name` |
| Row Level Security (RLS) | Express middleware: `optionalAuth`, `requireAuth`, `requireAdmin` |
| PostgreSQL triggers | MySQL `ON UPDATE CURRENT_TIMESTAMP` |
| Supabase email verification | Nodemailer via SMTP (`auth_tokens` table with hashed tokens) |
| `auth.uid()` in RLS | JWT decoded in every authenticated request |
| `auth.users` table | Custom `users` table in MySQL |
| Supabase Edge Function `admin-delete-user` | `DELETE /api/auth/users/:id` (admin-only) |

---

## 4. User Authentication

- **Library**: `bcryptjs` (12 rounds), `jsonwebtoken` (30-day JWT)
- **Signup**: validates input → checks duplicate email → hashes password → creates `users`, `profiles`, `user_roles` records → generates email verification token (hashed, stored in `auth_tokens`) → sends email if SMTP configured
- **Signin**: validates credentials → `bcrypt.compare` → issues JWT → returns `{ user, session }` matching Supabase response shape
- **Session**: JWT read from `Authorization: Bearer <token>` header, stored in `localStorage`
- **Password change**: authenticated endpoint `POST /api/auth/password`

---

## 5. Admin Authentication

- **Admin signup**: `POST /api/auth/admin-signup` — validates `ADMIN_SIGNUP_SECRET` from request body against env var (never exposed to frontend) → creates user with `role: admin` directly
- **Admin login**: same `/api/auth/signin` endpoint; frontend (`AdminLogin.tsx`) checks role after login and blocks non-admins
- **Admin-only routes**: `requireAdmin` middleware on `DELETE /api/auth/users/:id`
- **Role check**: `user_roles.role = 'admin'` in MySQL; included in JWT payload

---

## 6. Email Verification

- **On signup**: Node.js `crypto.randomBytes(32)` generates a raw token; `crypto.createHash('sha256')` stores only the hash in `auth_tokens`; expiry = 24 hours
- **Verification link**: `GET /api/auth/verify-email?token=…` → marks `users.email_verified = 1` → redirects to `${FRONTEND_URL}/verify-email?status=success`
- **Resend**: `POST /api/auth/resend-verification` invalidates old tokens, issues new one
- **Password reset**: same pattern; 60-minute expiry; link goes to `/admin/reset-password?token=…`
- **Transport**: Nodemailer with SMTP env vars; if `SMTP_HOST` is unset, tokens are printed to console in development

---

## 7. Setup Commands

```bash
# 1. Clone / import the project into your environment

# 2. Install dependencies
pnpm install

# 3. Copy and fill in environment variables
cp .env.example .env
# Edit .env with your MySQL credentials, JWT secret, SMTP settings, etc.

# 4. Create the database and import the schema
mysql -u root -p < database.sql

# 5. (Optional) Create your first admin account
#    POST http://localhost:5000/api/auth/admin-signup
#    Body: { email, password, full_name, secret: <ADMIN_SIGNUP_SECRET from .env> }

# 6. Start the API server
pnpm --filter @workspace/api-server run dev

# 7. Start the frontend
pnpm --filter @workspace/nuasa run dev

# 8. Open the app
#    Frontend: http://localhost:5173
#    API:      http://localhost:5000/api/healthz
```

### Environment variables reference
See `.env.example` for the full list. The minimum required to run:
```env
DB_HOST=localhost
DB_PORT=3306
DB_NAME=nuasa_database
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=long_random_secret
ADMIN_SIGNUP_SECRET=another_secret
FRONTEND_URL=http://localhost:5173
```

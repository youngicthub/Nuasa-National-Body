# NUASA National E-Library

A full-stack web platform for the **NUASA National Body** — featuring a blog, digital library, events, chapters, executives directory, and convention registrations.

## Stack

- **Frontend:** React + Vite + Tailwind CSS (shadcn/ui components)
- **Backend:** Express 5 API server (TypeScript, built with esbuild)
- **Database:** MySQL 8.0 (managed locally via `scripts/start-api.sh`)
- **Auth:** JWT-based
- **Package manager:** npm (workspaces)

## Running the project

### Quick start (from repo root)

```bash
npm install          # installs everything for both frontend and api-server
```

Then start each service in a separate terminal:

```bash
# Terminal 1 — API server + MySQL
cd artifacts/api-server
npm run dev

# Terminal 2 — Frontend
cd artifacts/nuasa
npm run dev
```

Or use the root workspace scripts:

```bash
npm run dev:api       # starts API server (port 8080)
npm run dev:frontend  # starts frontend (port 21844)
```

The frontend proxies `/api/*` requests to the API server automatically.

### On Replit

Two workflows run automatically:

| Workflow | Service |
|---|---|
| `artifacts/api-server: API Server` | MySQL + Express API on port 8080 |
| `artifacts/nuasa: web` | Vite dev server on port 21844 |

## Environment variables

Pre-configured in Replit's environment. Key variables:

| Variable | Purpose |
|---|---|
| `DB_HOST / DB_PORT / DB_NAME / DB_USER / DB_PASSWORD` | MySQL connection |
| `JWT_SECRET` | Signs/verifies auth tokens |
| `ADMIN_SIGNUP_SECRET` | Gate for admin registration |
| `FRONTEND_URL` | CORS origin and email link base |
| `SMTP_*` / `MAIL_FROM_*` | Outbound email (nodemailer) |

For local development, copy `.env.example` to `.env` and fill in values.

## Database

Schema is in `database.sql` (743 lines). It is imported automatically on first start by `scripts/start-api.sh`. Tables include: `users`, `profiles`, `user_roles`, `blog_posts`, `library_resources`, `categories`, `tags`, `events`, `chapters`, `executives`, `convention_registrations`, `app_settings`, and more.

## Project structure

```
artifacts/
  nuasa/          React + Vite frontend
  api-server/     Express API (TypeScript → esbuild → dist/index.mjs)
scripts/
  start-api.sh    MySQL init + API build + start script
database.sql      Full MySQL schema
package.json      Root npm workspace
```

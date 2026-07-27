# NUASA — National Body E-Library

A full-stack e-library platform for NUASA (National University Academic Staff Association), built with React + Vite on the frontend and an Express API server on the backend.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, TypeScript, shadcn-ui, Tailwind CSS, Framer Motion |
| Backend API | Express 5, TypeScript, Pino logging |
| Database | MySQL (via `mysql2`) |
| Auth/Data | Supabase (frontend) |
| Monorepo | pnpm workspace |

## How to run

### On Replit
Both services start automatically via their configured workflows:

- **Frontend** (`Frontend` workflow) — `PORT=21844 pnpm --filter @workspace/nuasa run dev`
- **API Server** (`API Server` workflow) — `PORT=8080 bash scripts/start-api.sh`

The frontend is served at `/` (port 21844 → external 80) and the API at `/api` (port 8080).

`scripts/start-api.sh` handles MySQL init, DB/user/schema setup on first run, builds the API, then starts it. MySQL data lives in `~/.mysql-data`; the setup marker at `~/.mysql-run/.db_setup_done` prevents re-running schema import on subsequent starts.

### On your local machine (single command)

```bash
bash scripts/start-local.sh
```

This will:
1. Load your `.env` file (copy from `.env.example` and fill it in first)
2. Create the MySQL database and user if they don't exist
3. Import `database.sql` (first run only — skipped if tables already exist)
4. Install pnpm dependencies if needed
5. Build + start the API server in the background → `http://localhost:5000`
6. Start the Vite frontend → `http://localhost:5173`

**Pre-requisites:** Node.js 20+, pnpm, and MySQL 8.0 running locally.

### Base URL (FRONTEND_URL) — auto-detected

| Environment | Value |
|---|---|
| `NODE_ENV=production` | `http://nuasanational.com.ng` |
| anything else (default) | `http://localhost:5173` |

Used in auth email links (verification, password reset). Override by setting `FRONTEND_URL` in your `.env`.

## Required secrets

Add these in the Secrets panel (padlock icon) when you're ready to connect to live data:

| Secret | Used by | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend | Supabase anon key |
| `DB_HOST` | API Server | MySQL host (default: `127.0.0.1`) |
| `DB_NAME` | API Server | Database name (default: `nuasa_database`) |
| `DB_USER` | API Server | Database user (default: `root`) |
| `DB_PASSWORD` | API Server | Database password |
| `JWT_SECRET` | API Server | Secret for signing JWTs |
| `SMTP_HOST` | API Server | SMTP server for email |
| `SMTP_USER` | API Server | SMTP username |
| `SMTP_PASSWORD` | API Server | SMTP password |
| `FLUTTERWAVE_PUBLIC_KEY` | API Server | Payment integration |

## Project structure

```
artifacts/
  nuasa/          # React frontend
  api-server/     # Express API server
lib/
  db/             # MySQL pool + query helper
  api-spec/       # OpenAPI spec
  api-zod/        # Zod schemas
  api-client-react/ # React hooks for API
.migration-backup/  # Original Lovable project (reference only)
```

## User preferences

- Keep the existing project structure and stack — do not restructure or migrate unless explicitly asked.

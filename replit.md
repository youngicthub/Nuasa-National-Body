# NUASA — National Body E-Library

A full-stack e-library platform for NUASA (National University Academic Staff Association), built with React + Vite on the frontend and an Express API server on the backend.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, TypeScript, shadcn-ui, Tailwind CSS, Framer Motion |
| Backend API | Express 5, TypeScript, Pino logging, `pg` |
| Database | PostgreSQL (local development fallback, starts automatically via `scripts/start-api.sh`) |
| Monorepo | pnpm workspace (also has npm workspace root scripts) |

## How to run on Replit

Both services start automatically via their configured workflows:

- **Frontend** — workflow `artifacts/nuasa: web` — `pnpm --filter @workspace/nuasa run dev`
- **API Server** — workflow `artifacts/api-server: API Server` — `bash scripts/start-api.sh`

The frontend is served at `/` (port 21844) and the API at port 8080.

In Replit development, `artifacts/nuasa/public/config.js` leaves the production API URL disabled, so the Vite dev proxy (`artifacts/nuasa/vite.config.ts`) forwards `/api/*` requests to `http://127.0.0.1:8080`. The production API URL remains in that file as a commented runtime setting and can be enabled for the separately hosted frontend.

`scripts/start-api.sh` handles PostgreSQL init, DB/user/schema setup on first run (`scripts/postgres-schema.sql`), builds the TypeScript API, then starts it. Local PostgreSQL data lives in `~/.pg-data`, with its socket in `~/.pg-run`. The setup marker at `~/.pg-run/.db_setup_done` prevents re-running schema import on subsequent starts.

**Install dependencies** (run once after cloning or if node_modules is missing):
```bash
pnpm install
```

### On your local machine (single command)

```bash
bash scripts/start-local.sh
```

This will:
1. Load your `.env` file (copy from `.env.example` and fill it in first)
2. Start the local PostgreSQL fallback and create the database/user if needed
3. Import `scripts/postgres-schema.sql` (first run only)
4. Build and start the API server → `http://localhost:8080`
5. Start the Vite frontend → `http://localhost:5173`

**Pre-requisites:** Node.js 20+ and pnpm. A local PostgreSQL installation is not required when using `scripts/start-api.sh`.

### Base URL (FRONTEND_URL) — auto-detected

| Environment | Value |
|---|---|
| `NODE_ENV=production` | `http://nuasanational.com.ng` |
| anything else (default) | `http://localhost:5173` |

Used in auth email links (verification, password reset). Override by setting `FRONTEND_URL` in your `.env`.

## Required secrets

Keep credentials in Replit Secrets; do not commit their values. The live application uses Neon PostgreSQL through `NEON_DATABASE_URL`; the API handles authentication with its own bcrypt password hashes and JWT sessions.

| Secret | Used by | Description |
|---|---|---|
| `NEON_DATABASE_URL` | API Server | Connection string for the live Neon PostgreSQL database |
| `JWT_SECRET` | API Server | Secret for signing JWT sessions |
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
  db/             # PostgreSQL pool + query helper
  api-spec/       # OpenAPI spec
  api-zod/        # Zod schemas
  api-client-react/ # React hooks for API
.migration-backup/  # Original Lovable project (reference only)
```

## User preferences

- Keep the existing project structure and stack — do not restructure or migrate unless explicitly asked.

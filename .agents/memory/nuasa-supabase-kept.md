---
name: NUASA migration - Supabase / database status
description: Database history and current production setup for the NUASA project
---

App originally used Supabase frontend + MySQL backend on cPanel/afeeshost.
The frontend now uses the Express API for JWT authentication and database
transport; no Supabase auth client or Supabase integration files remain.
The API uses pg for local development and Neon for production.

**Current state (production):**
- `NEON_DATABASE_URL` secret is set in Replit — API detects it and skips local PostgreSQL
- Schema is applied to Neon (all tables exist; some older index columns differ from schema file — harmless)
- The dev workflow uses local PostgreSQL via `scripts/start-api.sh` when
  `NEON_DATABASE_URL` is not available; production uses Neon directly.

**Why:** Autoscale deployment can't run local PostgreSQL; Neon is the production
DB, while the local fallback keeps the Replit preview self-contained.

**How to apply:** `NEON_DATABASE_URL` must stay set as a Replit Secret. Re-running `psql "$NEON_DATABASE_URL" -f scripts/postgres-schema.sql` is safe (IF NOT EXISTS guards).

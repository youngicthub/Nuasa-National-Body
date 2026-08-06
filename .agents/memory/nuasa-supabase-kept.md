---
name: NUASA migration - Supabase / database status
description: Database history and current production setup for the NUASA project
---

App originally used Supabase frontend + MySQL backend on cPanel/afeeshost.
Migrated to pg driver + local PostgreSQL for dev, Neon for production.

**Current state (production):**
- `NEON_DATABASE_URL` secret is set in Replit — API detects it and skips local PostgreSQL
- Schema is applied to Neon (all tables exist; some older index columns differ from schema file — harmless)
- Dev workflow still uses local PostgreSQL via `scripts/start-api.sh`

**Why:** Autoscale deployment can't run local PostgreSQL; Neon is the production DB.

**How to apply:** `NEON_DATABASE_URL` must stay set as a Replit Secret. Re-running `psql "$NEON_DATABASE_URL" -f scripts/postgres-schema.sql` is safe (IF NOT EXISTS guards).

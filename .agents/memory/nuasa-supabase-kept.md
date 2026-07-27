---
name: NUASA Supabase migration
description: What was done when migrating NUASA from Supabase to MySQL — decisions and what the local supabase shim covers.
---

# NUASA Supabase → MySQL migration

## What was done
The Supabase client in `artifacts/nuasa/src/integrations/supabase/client.ts` is a **complete local shim** — it does NOT import `@supabase/supabase-js`. All `supabase.*` calls in the frontend route to the local Express API server at `/api`.

All 21 MySQL tables are defined in `database.sql` at the project root. The user imports this file into their own MySQL 8+ server.

## Key decisions

**Why:** Supabase project was paused; migration instructions required local MySQL.

**Admin signup:** `ADMIN_SIGNUP_SECRET` is validated server-side only on `POST /api/auth/admin-signup`. The old `VITE_NUASA_ADMIN_TOKEN` (frontend-exposed) was removed from `AuthContext.tsx` and `AdminRegister.tsx`.

**`site_visits` inserts:** Anonymous visitors need to insert. Added `ANON_INSERT_TABLES` set in `local-data.ts` that bypasses auth requirement for those tables.

**Email tokens:** Stored as SHA-256 hashes in `auth_tokens` table. Raw token only in email link. GET `/api/auth/verify-email?token=…` redirects to `${FRONTEND_URL}/verify-email?status=success|invalid`.

**`AdminResetPassword.tsx`:** Rewritten to read `?token=` from URL query params instead of waiting for Supabase `PASSWORD_RECOVERY` auth event (which local client never emits).

**`AdminUsers.tsx`:** Removed dependency on localStorage admin-request functions (`getAdminRequests`, `removeAdminRequest`) from `AdminRegister.tsx`. Admin delete calls `DELETE /api/auth/users/:id`.

**`public.ts` bug fixed:** Local variable `query` (string) was shadowing imported `query` function — renamed to `sql`.

## How to apply
- DB credentials go in `.env` (never `.env.example`) — `.env` is now in `.gitignore`
- `database.sql` is importable with `mysql -u root -p < database.sql`
- See `MIGRATION_REPORT.md` for full endpoint list and setup commands

---
name: Neon schema vs app schema mismatch
description: The Neon PostgreSQL DB retains the old Supabase schema; the app code expects a newer MySQL-migrated schema. Several columns were missing and had to be added manually.
---

# Neon Schema vs App Schema Mismatch

## The Rule
Never assume the Neon DB schema matches `database.sql`. The Neon DB was provisioned from the original Supabase schema, which predates the MySQL migration. Always query `information_schema.columns` before inserting into tables that may have diverged.

**Why:** The `database.sql` file reflects the MySQL target schema (post-migration). Neon still has the original Supabase column names. They differ significantly for `convention_registrations` and `site_visits`.

**How to apply:** Before adding new features that write to Neon tables, run:
```sql
SELECT column_name FROM information_schema.columns WHERE table_name='<table>' ORDER BY ordinal_position;
```

## Columns added to Neon (via migration script) — not in original Supabase schema
`convention_registrations`:
- `amount` (numeric)
- `tx_ref` (text, UNIQUE)
- `chapter_name` (text)
- `delegates_count` (integer, default 1)
- `notes` (text)
- `breakout_session` (text)
- `matric_number` (text)
- `accommodation_request` (text)
- `payment_status` (text, default 'pending')

`site_visits`:
- `path` (text)

## Auto-created convention users
Convention registrants get user accounts created automatically (password "123456", `email_verified=true`) in `local-data.ts` before the auth guard runs. This means they can log in immediately without email verification.

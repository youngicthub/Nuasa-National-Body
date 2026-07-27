# Database

This folder contains the full database schema used by the NUASA National E-Library platform.

## Files

- **`schema.sql`** — Complete PostgreSQL schema: tables, enums, functions, triggers, RLS policies, and storage buckets.

## Restoring on a fresh Supabase project

1. Create a new Supabase project at https://supabase.com.
2. Open the SQL editor and paste the contents of `schema.sql`, then run it.
   - Or via CLI: `psql "$DATABASE_URL" -f database/schema.sql`
3. Copy `.env.example` to `.env` (in the project root) and fill in your Supabase URL, anon key, and project ID.
4. Run the app: `npm install && npm run dev`.

## Notes

- The app expects an admin user. After signing up your first account, manually insert a row into `user_roles`:
  ```sql
  INSERT INTO public.user_roles (user_id, role)
  VALUES ('<your-auth-user-id>', 'admin');
  ```
- Storage buckets (`chapter-images`, `library-files`, `blog-images`) are created public; tighten policies if needed.

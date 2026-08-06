-- ============================================================================
-- NUASA — Remove specific convention registrations and their user accounts
-- Run this against the production (Neon) database:
--   psql "YOUR_NEON_DATABASE_URL" -f scripts/delete-registrations.sql
-- ============================================================================

-- Step 1: Remove convention registrations for these emails
DELETE FROM convention_registrations
WHERE LOWER(email) IN (
  'dotempire01@gmail.com',
  'akoredegoodnesso@gmail.com',
  'kabirusaidu526@gmail.com',
  'abdulrazaqmubarak09@gmail.com',
  'oluwatofunmiadebayo23@gmail.com',
  'kareematimam751@gmail.com',
  'onuhella75@gmail.com',
  'taiwobello569@gmail.com'
);

-- Step 2: Unlink any blog posts or resources authored by these users
UPDATE blog_posts SET author_id = NULL
WHERE author_id IN (
  SELECT id FROM users WHERE LOWER(email) IN (
    'dotempire01@gmail.com',
    'akoredegoodnesso@gmail.com',
    'kabirusaidu526@gmail.com',
    'abdulrazaqmubarak09@gmail.com',
    'oluwatofunmiadebayo23@gmail.com',
    'kareematimam751@gmail.com',
    'onuhella75@gmail.com',
    'taiwobello569@gmail.com'
  )
);

UPDATE library_resources SET author_id = NULL
WHERE author_id IN (
  SELECT id FROM users WHERE LOWER(email) IN (
    'dotempire01@gmail.com',
    'akoredegoodnesso@gmail.com',
    'kabirusaidu526@gmail.com',
    'abdulrazaqmubarak09@gmail.com',
    'oluwatofunmiadebayo23@gmail.com',
    'kareematimam751@gmail.com',
    'onuhella75@gmail.com',
    'taiwobello569@gmail.com'
  )
);

-- Step 3: Delete user accounts (cascades to auth_tokens, user_roles, profiles)
DELETE FROM users
WHERE LOWER(email) IN (
  'dotempire01@gmail.com',
  'akoredegoodnesso@gmail.com',
  'kabirusaidu526@gmail.com',
  'abdulrazaqmubarak09@gmail.com',
  'oluwatofunmiadebayo23@gmail.com',
  'kareematimam751@gmail.com',
  'onuhella75@gmail.com',
  'taiwobello569@gmail.com'
);

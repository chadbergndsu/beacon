-- Soft-pilot account binding (Chris / Marian / teacher).
-- Run in Supabase SQL Editor AFTER inviting families.
--
-- 1) Create Auth users in Supabase Dashboard (Authentication → Users)
--    with the emails below (or edit the emails to match yours).
-- 2) Confirm a school row exists (schools table).
-- 3) Paste this script — it binds role + school_id on matching profiles.
--
-- Auth user create does NOT auto-create profiles in every setup; if a profile
-- row is missing, insert one with the auth user's UUID.

-- Prefer the first school (pilot is usually single-tenant). Override if needed:
--   \set school_id 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'

WITH school AS (
  SELECT id FROM schools ORDER BY created_at NULLS LAST, name LIMIT 1
)
UPDATE profiles p
SET
  school_id = COALESCE(p.school_id, (SELECT id FROM school)),
  role = 'principal',
  full_name = COALESCE(NULLIF(TRIM(p.full_name), ''), 'Chris Cowan')
WHERE lower(p.email) IN (
  'principal@lighthouse.test',
  'chris@lighthouse.test'
)
  AND (SELECT id FROM school) IS NOT NULL;

WITH school AS (
  SELECT id FROM schools ORDER BY created_at NULLS LAST, name LIMIT 1
)
UPDATE profiles p
SET
  school_id = COALESCE(p.school_id, (SELECT id FROM school)),
  role = 'admin',
  full_name = COALESCE(NULLIF(TRIM(p.full_name), ''), 'Marian Gordon')
WHERE lower(p.email) IN (
  'office@lighthouse.test',
  'marian@lighthouse.test',
  'marian.gordon@lighthouse.test'
)
  AND (SELECT id FROM school) IS NOT NULL;

-- Example teacher (edit email). Creates nothing if profile missing.
WITH school AS (
  SELECT id FROM schools ORDER BY created_at NULLS LAST, name LIMIT 1
)
UPDATE profiles p
SET
  school_id = COALESCE(p.school_id, (SELECT id FROM school)),
  role = 'teacher',
  full_name = COALESCE(NULLIF(TRIM(p.full_name), ''), 'Pilot Teacher')
WHERE lower(p.email) IN (
  'teacher@lighthouse.test'
)
  AND (SELECT id FROM school) IS NOT NULL;

-- Sanity check
SELECT email, role, full_name, school_id IS NOT NULL AS has_school
FROM profiles
WHERE lower(email) IN (
  'principal@lighthouse.test',
  'chris@lighthouse.test',
  'office@lighthouse.test',
  'marian@lighthouse.test',
  'marian.gordon@lighthouse.test',
  'teacher@lighthouse.test'
)
ORDER BY role, email;

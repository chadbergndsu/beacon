-- Office admin (secretary / power user) — e.g. Marian Gordon at Lighthouse pilot.
-- Auth user must exist in Supabase; this only sets profile role/name when the row is present.
UPDATE profiles
SET
  role = 'admin',
  full_name = COALESCE(NULLIF(TRIM(full_name), ''), 'Marian Gordon')
WHERE email IN ('office@lighthouse.test', 'marian@lighthouse.test')
  AND role IN ('teacher', 'parent', 'staff');

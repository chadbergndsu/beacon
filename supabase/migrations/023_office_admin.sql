-- Office admin (secretary / power user) — e.g. Marian Gordon at Lighthouse pilot.
-- Auth user + profile row must already exist. Binds role, display name, and school_id
-- (first school) when school_id is still null.
WITH school AS (
  SELECT id FROM schools ORDER BY created_at NULLS LAST, name LIMIT 1
)
UPDATE profiles p
SET
  role = 'admin',
  full_name = COALESCE(NULLIF(TRIM(full_name), ''), 'Marian Gordon'),
  school_id = COALESCE(p.school_id, (SELECT id FROM school))
WHERE lower(p.email) IN (
  'office@lighthouse.test',
  'marian@lighthouse.test',
  'marian.gordon@lighthouse.test'
)
  AND role IN ('teacher', 'parent', 'staff', 'admin')
  AND (SELECT id FROM school) IS NOT NULL;

-- Principal seed emails (same first-school bind when unset)
WITH school AS (
  SELECT id FROM schools ORDER BY created_at NULLS LAST, name LIMIT 1
)
UPDATE profiles p
SET
  role = 'principal',
  full_name = COALESCE(NULLIF(TRIM(full_name), ''), 'Chris Cowan'),
  school_id = COALESCE(p.school_id, (SELECT id FROM school))
WHERE lower(p.email) IN (
  'principal@lighthouse.test',
  'chris@lighthouse.test'
)
  AND role IN ('teacher', 'parent', 'staff', 'admin', 'principal')
  AND (SELECT id FROM school) IS NOT NULL;

-- Allow principal role on profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'teacher', 'parent', 'staff', 'principal'));

-- Legacy demo emails only: prefer profiles.role = 'principal' per school,
-- or BEACON_PRINCIPAL_EMAIL env for seed elevation.
UPDATE profiles
SET role = 'principal'
WHERE email IN ('principal@lighthouse.test', 'principal@example.test')
  AND role <> 'principal';

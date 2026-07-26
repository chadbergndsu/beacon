-- Allow principal role on profiles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'teacher', 'parent', 'staff', 'principal'));

-- Promote Chris Cowan demo principal account if present
UPDATE profiles
SET role = 'principal',
    full_name = 'Chris Cowan'
WHERE email = 'principal@lighthouse.test';

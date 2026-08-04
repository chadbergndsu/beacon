-- Optional SQL smoke checks after pending-016 (run in Supabase SQL Editor).
-- These are assertions for humans/ops — not automated CI.

-- 1) Identity trigger exists
SELECT tgname
FROM pg_trigger
WHERE tgname = 'trg_profiles_protect_identity';

-- 2) Token vault has deny-all client policy
SELECT polname, polcmd
FROM pg_policy
WHERE polrelid = 'school_access_tokens'::regclass;

-- 3) No legacy kiosk secrets left in settings
SELECT id, name
FROM schools
WHERE settings::jsonb #>> '{badge,kioskToken}' IS NOT NULL
   OR settings::jsonb #>> '{badge,deviceToken}' IS NOT NULL;
-- Expect 0 rows

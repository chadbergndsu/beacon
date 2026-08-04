-- Paste in Supabase SQL Editor (security hardening)
-- Same as supabase/migrations/015_security_hardening.sql

CREATE TABLE IF NOT EXISTS school_access_tokens (
  school_id UUID PRIMARY KEY REFERENCES schools(id) ON DELETE CASCADE,
  kiosk_token TEXT NOT NULL,
  device_token TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_school_access_kiosk
  ON school_access_tokens (kiosk_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_school_access_device
  ON school_access_tokens (device_token);

ALTER TABLE school_access_tokens ENABLE ROW LEVEL SECURITY;

ALTER TABLE IF EXISTS roster_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access roster_revisions" ON roster_revisions;
CREATE POLICY "No client access roster_revisions" ON roster_revisions
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client access approval_requests" ON approval_requests;
CREATE POLICY "No client access approval_requests" ON approval_requests
  FOR ALL USING (false) WITH CHECK (false);

CREATE UNIQUE INDEX IF NOT EXISTS idx_aftercare_one_open_per_student
  ON aftercare_sessions (school_id, student_id)
  WHERE status = 'open';

ALTER TABLE classes ADD COLUMN IF NOT EXISTS call_number TEXT;

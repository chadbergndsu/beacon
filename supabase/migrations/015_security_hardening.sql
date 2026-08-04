-- Security hardening: RLS, tokens table, aftercare uniqueness, call_number if missing

-- Dedicated secrets (service role only — no client SELECT policies)
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
-- Intentionally no policies: only service_role (admin client) accesses this table.

-- Roster version control + approvals: RLS deny-by-default for clients
ALTER TABLE IF EXISTS roster_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "No client access roster_revisions" ON roster_revisions;
CREATE POLICY "No client access roster_revisions" ON roster_revisions
  FOR ALL USING (false) WITH CHECK (false);

DROP POLICY IF EXISTS "No client access approval_requests" ON approval_requests;
CREATE POLICY "No client access approval_requests" ON approval_requests
  FOR ALL USING (false) WITH CHECK (false);

-- One open aftercare session per student per school
CREATE UNIQUE INDEX IF NOT EXISTS idx_aftercare_one_open_per_student
  ON aftercare_sessions (school_id, student_id)
  WHERE status = 'open';

-- Optional call_number (idempotent)
ALTER TABLE classes ADD COLUMN IF NOT EXISTS call_number TEXT;

-- Paste in Supabase SQL Editor for badge/kiosk tables
-- (same as supabase/migrations/011_badge_kiosk.sql)

ALTER TABLE students ADD COLUMN IF NOT EXISTS badge_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_school_badge ON students (school_id, badge_code) WHERE badge_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS school_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'classroom' CHECK (kind IN ('classroom', 'aftercare', 'office', 'gym', 'other')),
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL,
  billable BOOLEAN NOT NULL DEFAULT FALSE,
  rate_cents_per_hour INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_school_rooms_school ON school_rooms(school_id);

CREATE TABLE IF NOT EXISTS badge_scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  room_id UUID REFERENCES school_rooms(id) ON DELETE SET NULL,
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  purpose TEXT NOT NULL DEFAULT 'attendance' CHECK (purpose IN ('attendance', 'aftercare', 'general')),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'kiosk',
  kiosk_label TEXT,
  session_id UUID,
  meta JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_badge_scans_school_time ON badge_scans(school_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_scans_student ON badge_scans(student_id, scanned_at DESC);

CREATE TABLE IF NOT EXISTS aftercare_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  room_id UUID REFERENCES school_rooms(id) ON DELETE SET NULL,
  check_in_at TIMESTAMPTZ NOT NULL,
  check_out_at TIMESTAMPTZ,
  minutes INTEGER,
  rate_cents_per_hour INTEGER NOT NULL DEFAULT 0,
  amount_cents INTEGER,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'billed', 'void')),
  invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aftercare_open ON aftercare_sessions(school_id, status) WHERE status = 'open';
-- Paste in Supabase SQL Editor (RFID + hardware path)
-- Same as supabase/migrations/012_rfid_parent_notify.sql

ALTER TABLE students ADD COLUMN IF NOT EXISTS rfid_uid TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_school_rfid
  ON students (school_id, rfid_uid)
  WHERE rfid_uid IS NOT NULL;
-- Paste in Supabase SQL Editor
-- Same as supabase/migrations/013_roster_versions_approvals.sql

CREATE TABLE IF NOT EXISTS roster_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('student', 'class', 'enrollment')),
  entity_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (
    action IN (
      'create',
      'update',
      'soft_delete',
      'restore',
      'enroll',
      'unenroll',
      'assign_teacher'
    )
  ),
  before_data JSONB,
  after_data JSONB,
  actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_roster_revisions_school_time
  ON roster_revisions (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_roster_revisions_entity
  ON roster_revisions (entity_type, entity_id, created_at DESC);

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('delete_student', 'delete_class', 'unenroll_student')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('student', 'class', 'enrollment')),
  entity_id UUID NOT NULL,
  entity_label TEXT NOT NULL DEFAULT '',
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('pending', 'approved', 'rejected', 'cancelled')
  ),
  reviewer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_school_status
  ON approval_requests (school_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester
  ON approval_requests (requested_by, created_at DESC);
-- Paste in Supabase SQL Editor
ALTER TABLE classes ADD COLUMN IF NOT EXISTS call_number TEXT;

CREATE INDEX IF NOT EXISTS idx_classes_school_call
  ON classes (school_id, call_number)
  WHERE call_number IS NOT NULL;
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

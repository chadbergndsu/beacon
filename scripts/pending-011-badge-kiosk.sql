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

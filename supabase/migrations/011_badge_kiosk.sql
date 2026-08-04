-- Badge / kiosk: student codes, rooms, scans, aftercare sessions (attendance + payments)

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS badge_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_school_badge
  ON students (school_id, badge_code)
  WHERE badge_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS school_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'classroom'
    CHECK (kind IN ('classroom', 'aftercare', 'office', 'gym', 'other')),
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
  purpose TEXT NOT NULL DEFAULT 'attendance'
    CHECK (purpose IN ('attendance', 'aftercare', 'general')),
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'kiosk',
  kiosk_label TEXT,
  session_id UUID,
  meta JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_badge_scans_school_time ON badge_scans(school_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_scans_student ON badge_scans(student_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_badge_scans_room ON badge_scans(room_id, scanned_at DESC);

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
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed', 'billed', 'void')),
  invoice_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aftercare_open
  ON aftercare_sessions(school_id, status)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_aftercare_student ON aftercare_sessions(student_id, check_in_at DESC);

ALTER TABLE school_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE badge_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE aftercare_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage school rooms" ON school_rooms;
CREATE POLICY "Staff manage school rooms" ON school_rooms FOR ALL
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );

DROP POLICY IF EXISTS "Staff view badge scans" ON badge_scans;
CREATE POLICY "Staff view badge scans" ON badge_scans FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );

DROP POLICY IF EXISTS "Staff insert badge scans" ON badge_scans;
CREATE POLICY "Staff insert badge scans" ON badge_scans FOR INSERT
  WITH CHECK (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );

DROP POLICY IF EXISTS "Staff manage aftercare" ON aftercare_sessions;
CREATE POLICY "Staff manage aftercare" ON aftercare_sessions FOR ALL
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );

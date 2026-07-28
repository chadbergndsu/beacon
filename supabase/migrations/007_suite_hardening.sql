-- Beacon suite hardening: attendance + first-class module tables
-- Safe to re-run where possible

-- ========== ATTENDANCE ==========
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'tardy', 'excused')),
  note TEXT,
  marked_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (class_id, student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance(class_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school ON attendance(school_id);

-- ========== LESSON PLANS ==========
CREATE TABLE IF NOT EXISTS lesson_plans (
  id TEXT PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  unit TEXT,
  objectives TEXT NOT NULL DEFAULT '',
  materials TEXT NOT NULL DEFAULT '',
  activities TEXT NOT NULL DEFAULT '',
  scripture TEXT,
  homework TEXT,
  differentiation TEXT,
  assessment TEXT,
  duration_minutes INTEGER DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'ready', 'taught')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lesson_plans_class ON lesson_plans(class_id, date DESC);

-- ========== BEACON PULSE ==========
CREATE TABLE IF NOT EXISTS pulse_entries (
  id TEXT PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id),
  teacher_name TEXT,
  date DATE NOT NULL,
  overall TEXT NOT NULL CHECK (overall IN ('strong', 'steady', 'needs_care')),
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  note TEXT,
  celebrate TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pulse_student ON pulse_entries(student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_school ON pulse_entries(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pulse_class ON pulse_entries(class_id, date DESC);

-- ========== SCHOOL VIDEOS ==========
CREATE TABLE IF NOT EXISTS school_videos (
  id TEXT PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'other',
  category TEXT NOT NULL DEFAULT 'other',
  featured BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_videos_school ON school_videos(school_id, created_at DESC);

-- ========== RLS ==========
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE pulse_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_videos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_school_leadership()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_user_role() IN ('admin', 'staff', 'principal'), false);
$$;

CREATE OR REPLACE FUNCTION public.teaches_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = p_class_id AND c.teacher_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.parent_of_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_students ps
    WHERE ps.student_id = p_student_id AND ps.parent_id = auth.uid()
  );
$$;

-- Attendance policies
DROP POLICY IF EXISTS "att_staff_all" ON attendance;
CREATE POLICY "att_staff_all" ON attendance FOR ALL
  USING (
    school_id = get_user_school_id()
    AND (is_school_leadership() OR teaches_class(class_id))
  );

DROP POLICY IF EXISTS "att_parent_select" ON attendance;
CREATE POLICY "att_parent_select" ON attendance FOR SELECT
  USING (parent_of_student(student_id));

-- Lesson plans
DROP POLICY IF EXISTS "lp_staff_all" ON lesson_plans;
CREATE POLICY "lp_staff_all" ON lesson_plans FOR ALL
  USING (
    school_id = get_user_school_id()
    AND (is_school_leadership() OR teaches_class(class_id))
  );

-- Pulse
DROP POLICY IF EXISTS "pulse_staff_all" ON pulse_entries;
CREATE POLICY "pulse_staff_all" ON pulse_entries FOR ALL
  USING (
    school_id = get_user_school_id()
    AND (is_school_leadership() OR teaches_class(class_id))
  );

DROP POLICY IF EXISTS "pulse_parent_select" ON pulse_entries;
CREATE POLICY "pulse_parent_select" ON pulse_entries FOR SELECT
  USING (parent_of_student(student_id));

-- Videos: leadership write, school staff read
DROP POLICY IF EXISTS "vid_leadership_all" ON school_videos;
CREATE POLICY "vid_leadership_all" ON school_videos FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());

DROP POLICY IF EXISTS "vid_staff_select" ON school_videos;
CREATE POLICY "vid_staff_select" ON school_videos FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );

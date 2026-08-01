-- Beacon school suite
-- Initial schema - multi-tenant, secure, adjustable grades

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Schools
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID REFERENCES schools(id),
  role TEXT NOT NULL CHECK (role IN ('admin', 'teacher', 'parent', 'staff')),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  grade_level TEXT,
  date_of_birth DATE,
  photo_url TEXT,
  medical_notes TEXT,
  allergies TEXT,
  emergency_contact JSONB,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Parent-Student links
CREATE TABLE parent_students (
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  relationship TEXT DEFAULT 'parent',
  PRIMARY KEY (parent_id, student_id)
);

-- Classes
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  name TEXT NOT NULL,
  subject TEXT,
  teacher_id UUID REFERENCES profiles(id),
  grade_level TEXT,
  term TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enrollments
CREATE TABLE enrollments (
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, class_id)
);

-- Grade Categories (fully adjustable)
CREATE TABLE grade_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight NUMERIC(5,2) NOT NULL CHECK (weight >= 0 AND weight <= 100),
  drop_lowest INTEGER DEFAULT 0,
  UNIQUE(class_id, name)
);

-- Assignments
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  category_id UUID REFERENCES grade_categories(id),
  title TEXT NOT NULL,
  max_points NUMERIC(8,2) NOT NULL DEFAULT 100,
  due_date DATE,
  is_extra_credit BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grades (single source of truth)
CREATE TABLE grades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  score NUMERIC(8,2),
  is_missing BOOLEAN DEFAULT FALSE,
  is_late BOOLEAN DEFAULT FALSE,
  comments TEXT,
  entered_by UUID REFERENCES profiles(id),
  entered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(assignment_id, student_id)
);

-- Discipline (highly restricted)
CREATE TABLE discipline_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id),
  student_id UUID NOT NULL REFERENCES students(id),
  date DATE NOT NULL,
  type TEXT,
  description TEXT,
  recorded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Announcements
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  class_id UUID REFERENCES classes(id),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id),
  published_at TIMESTAMPTZ DEFAULT NOW(),
  audience TEXT DEFAULT 'parents'
);

-- Audit log
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID,
  user_id UUID,
  action TEXT,
  table_name TEXT,
  record_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_students_school ON students(school_id);
CREATE INDEX idx_classes_school ON classes(school_id);
CREATE INDEX idx_classes_teacher ON classes(teacher_id);
CREATE INDEX idx_grades_assignment ON grades(assignment_id);
CREATE INDEX idx_grades_student ON grades(student_id);
CREATE INDEX idx_enrollments_student ON enrollments(student_id);
CREATE INDEX idx_enrollments_class ON enrollments(class_id);
CREATE INDEX idx_parent_students_parent ON parent_students(parent_id);
CREATE INDEX idx_parent_students_student ON parent_students(student_id);
CREATE INDEX idx_assignments_class ON assignments(class_id);
CREATE INDEX idx_grade_categories_class ON grade_categories(class_id);

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

-- Enable RLS
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE parent_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE discipline_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Basic isolation policies (refine further in app testing)
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

CREATE POLICY "School isolation students" ON students FOR ALL
  USING (school_id = get_user_school_id());

CREATE POLICY "Parents see linked students" ON students FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.student_id = students.id AND ps.parent_id = auth.uid()
    )
  );

CREATE POLICY "School isolation classes" ON classes FOR ALL
  USING (school_id = get_user_school_id());

CREATE POLICY "School isolation grades" ON grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.id = grades.assignment_id AND c.school_id = get_user_school_id()
    )
  );

CREATE POLICY "Teachers manage own class grades" ON grades FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE a.id = grades.assignment_id AND c.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Parents view child grades" ON grades FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.student_id = grades.student_id AND ps.parent_id = auth.uid()
    )
  );

CREATE POLICY "Discipline restricted" ON discipline_records FOR ALL
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff')
  );

-- Add more fine-grained policies as the app grows.
-- Comments: Medical notes are restricted via app logic + RLS on students; consider views for column masking later.

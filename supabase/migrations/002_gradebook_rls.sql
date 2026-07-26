-- Additional RLS so gradebook routes can read/write related tables.
-- Safe to re-run: drops policies if they already exist, then recreates them.

-- Schools: members can view their school
DROP POLICY IF EXISTS "View own school" ON schools;
CREATE POLICY "View own school" ON schools FOR SELECT
  USING (id = get_user_school_id());

-- Parent–student links
DROP POLICY IF EXISTS "Parents see own links" ON parent_students;
CREATE POLICY "Parents see own links" ON parent_students FOR SELECT
  USING (parent_id = auth.uid());

DROP POLICY IF EXISTS "School staff manage parent links" ON parent_students;
CREATE POLICY "School staff manage parent links" ON parent_students FOR ALL
  USING (
    get_user_role() IN ('admin', 'staff')
    AND EXISTS (
      SELECT 1 FROM students s
      WHERE s.id = parent_students.student_id
        AND s.school_id = get_user_school_id()
    )
  );

-- Enrollments via class school or teacher
DROP POLICY IF EXISTS "School isolation enrollments" ON enrollments;
CREATE POLICY "School isolation enrollments" ON enrollments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = enrollments.class_id
        AND c.school_id = get_user_school_id()
    )
  );

DROP POLICY IF EXISTS "Parents see child enrollments" ON enrollments;
CREATE POLICY "Parents see child enrollments" ON enrollments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.student_id = enrollments.student_id
        AND ps.parent_id = auth.uid()
    )
  );

-- Grade categories
DROP POLICY IF EXISTS "School isolation grade_categories" ON grade_categories;
CREATE POLICY "School isolation grade_categories" ON grade_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = grade_categories.class_id
        AND c.school_id = get_user_school_id()
    )
  );

-- Assignments
DROP POLICY IF EXISTS "School isolation assignments" ON assignments;
CREATE POLICY "School isolation assignments" ON assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.id = assignments.class_id
        AND c.school_id = get_user_school_id()
    )
  );

DROP POLICY IF EXISTS "Parents view child class assignments" ON assignments;
CREATE POLICY "Parents view child class assignments" ON assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN parent_students ps ON ps.student_id = e.student_id
      WHERE e.class_id = assignments.class_id
        AND ps.parent_id = auth.uid()
    )
  );

-- Profiles: school staff can list profiles in their school
DROP POLICY IF EXISTS "School staff view school profiles" ON profiles;
CREATE POLICY "School staff view school profiles" ON profiles FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'teacher')
  );

-- Announcements
DROP POLICY IF EXISTS "School isolation announcements" ON announcements;
CREATE POLICY "School isolation announcements" ON announcements FOR SELECT
  USING (
    school_id = get_user_school_id()
    OR school_id IS NULL
  );

DROP POLICY IF EXISTS "Staff write announcements" ON announcements;
CREATE POLICY "Staff write announcements" ON announcements FOR ALL
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'teacher')
  );

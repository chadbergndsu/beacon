-- Fix infinite recursion in students / parent_students / enrollments policies.
-- Policies must not query tables that policy-check back into the same tables.
-- Use SECURITY DEFINER helpers instead.

CREATE OR REPLACE FUNCTION public.is_parent_of(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM parent_students ps
    WHERE ps.student_id = p_student_id
      AND ps.parent_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.student_in_my_school(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM students s
    WHERE s.id = p_student_id
      AND s.school_id = public.get_user_school_id()
  );
$$;

CREATE OR REPLACE FUNCTION public.parent_can_view_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM enrollments e
    JOIN parent_students ps ON ps.student_id = e.student_id
    WHERE e.class_id = p_class_id
      AND ps.parent_id = auth.uid()
  );
$$;

-- Students
DROP POLICY IF EXISTS "Parents see linked students" ON students;
CREATE POLICY "Parents see linked students" ON students FOR SELECT
  USING (public.is_parent_of(id));

-- parent_students (avoid selecting students with RLS inside policy)
DROP POLICY IF EXISTS "School staff manage parent links" ON parent_students;
CREATE POLICY "School staff manage parent links" ON parent_students FOR ALL
  USING (
    public.get_user_role() IN ('admin', 'staff')
    AND public.student_in_my_school(student_id)
  );

-- Enrollments parent policy
DROP POLICY IF EXISTS "Parents see child enrollments" ON enrollments;
CREATE POLICY "Parents see child enrollments" ON enrollments FOR SELECT
  USING (public.is_parent_of(student_id));

-- Assignments parent policy
DROP POLICY IF EXISTS "Parents view child class assignments" ON assignments;
CREATE POLICY "Parents view child class assignments" ON assignments FOR SELECT
  USING (public.parent_can_view_class(class_id));

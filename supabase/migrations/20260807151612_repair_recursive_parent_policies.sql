-- Some early pilots installed the pre-003 parent policies, which query
-- students and parent_students through each other's RLS and recurse. Recreate
-- the parent boundary with the private SECURITY DEFINER lookups installed by
-- the preceding helper-hardening migration.

DROP POLICY IF EXISTS "Parents see linked students" ON public.students;
CREATE POLICY "Parents see linked students"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (private.is_parent_of(id));

DROP POLICY IF EXISTS "School staff manage parent links" ON public.parent_students;
CREATE POLICY "School staff manage parent links"
  ON public.parent_students
  FOR ALL
  TO authenticated
  USING (
    (SELECT private.get_user_role()) IN ('admin', 'staff')
    AND private.student_in_my_school(student_id)
    AND private.parent_in_my_school(parent_id)
  )
  WITH CHECK (
    (SELECT private.get_user_role()) IN ('admin', 'staff')
    AND private.student_in_my_school(student_id)
    AND private.parent_in_my_school(parent_id)
  );

DROP POLICY IF EXISTS "Parents see child enrollments" ON public.enrollments;
CREATE POLICY "Parents see child enrollments"
  ON public.enrollments
  FOR SELECT
  TO authenticated
  USING (private.is_parent_of(student_id));

DROP POLICY IF EXISTS "Parents view child class assignments" ON public.assignments;
CREATE POLICY "Parents view child class assignments"
  ON public.assignments
  FOR SELECT
  TO authenticated
  USING (private.parent_can_view_class(class_id));

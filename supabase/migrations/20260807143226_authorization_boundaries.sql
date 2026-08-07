-- Close P0 authorization gaps between application role checks and database RLS.
--
-- Invariants:
--   * teachers may reach only classes they own and students/enrollments in those classes
--   * admin/staff/principal keep school-wide roster access
--   * parent read policies remain unchanged

-- ========== 1) Teacher roster access follows class ownership ==========

-- Some pilot databases applied early migrations manually and do not have the
-- recursion-safe helper from 003. Define it here so enrollment policies can
-- validate the student's tenant without recursively invoking students RLS.
CREATE OR REPLACE FUNCTION public.student_in_my_school(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = p_student_id
        AND s.school_id = public.get_user_school_id()
    );
$$;

-- Migration 007 normally owns this helper. Recreate it here because the pilot
-- database may have been assembled from manual SQL bundles.
CREATE OR REPLACE FUNCTION public.teaches_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = p_class_id
        AND c.school_id = public.get_user_school_id()
        AND c.teacher_id = auth.uid()
    );
$$;

-- Students: leadership may manage the school roster. Teachers get read-only
-- access to students enrolled in a class they teach; writes continue through
-- server actions, which enforce class ownership and use the service role.
DROP POLICY IF EXISTS "School isolation students" ON public.students;
DROP POLICY IF EXISTS "staff_students_all" ON public.students;
DROP POLICY IF EXISTS "school_leadership_students_all" ON public.students;
DROP POLICY IF EXISTS "teacher_students_select" ON public.students;

CREATE POLICY "school_leadership_students_all"
  ON public.students
  FOR ALL
  TO authenticated
  USING (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT public.get_user_role()) IN ('admin', 'staff', 'principal')
  )
  WITH CHECK (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT public.get_user_role()) IN ('admin', 'staff', 'principal')
  );

CREATE POLICY "teacher_students_select"
  ON public.students
  FOR SELECT
  TO authenticated
  USING (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT public.get_user_role()) = 'teacher'
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      WHERE e.student_id = students.id
        AND public.teaches_class(e.class_id)
    )
  );

-- Classes: teachers can manage only rows whose teacher_id is their own user id.
DROP POLICY IF EXISTS "School isolation classes" ON public.classes;
DROP POLICY IF EXISTS "staff_classes_all" ON public.classes;
DROP POLICY IF EXISTS "school_leadership_classes_all" ON public.classes;
DROP POLICY IF EXISTS "teacher_own_classes_all" ON public.classes;

CREATE POLICY "school_leadership_classes_all"
  ON public.classes
  FOR ALL
  TO authenticated
  USING (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT public.get_user_role()) IN ('admin', 'staff', 'principal')
  )
  WITH CHECK (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT public.get_user_role()) IN ('admin', 'staff', 'principal')
  );

CREATE POLICY "teacher_own_classes_all"
  ON public.classes
  FOR ALL
  TO authenticated
  USING (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT public.get_user_role()) = 'teacher'
    AND teacher_id = (SELECT auth.uid())
  )
  WITH CHECK (
    school_id = (SELECT public.get_user_school_id())
    AND (SELECT public.get_user_role()) = 'teacher'
    AND teacher_id = (SELECT auth.uid())
  );

-- Enrollments: teachers can manage membership only for their classes and may
-- not attach a cross-school student even if they learn that student's UUID.
DROP POLICY IF EXISTS "School isolation enrollments" ON public.enrollments;
DROP POLICY IF EXISTS "staff_enrollments_all" ON public.enrollments;
DROP POLICY IF EXISTS "school_leadership_enrollments_all" ON public.enrollments;
DROP POLICY IF EXISTS "teacher_own_enrollments_all" ON public.enrollments;

CREATE POLICY "school_leadership_enrollments_all"
  ON public.enrollments
  FOR ALL
  TO authenticated
  USING (
    (SELECT public.get_user_role()) IN ('admin', 'staff', 'principal')
    AND public.student_in_my_school(student_id)
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = enrollments.class_id
        AND c.school_id = (SELECT public.get_user_school_id())
    )
  )
  WITH CHECK (
    (SELECT public.get_user_role()) IN ('admin', 'staff', 'principal')
    AND public.student_in_my_school(student_id)
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = enrollments.class_id
        AND c.school_id = (SELECT public.get_user_school_id())
    )
  );

CREATE POLICY "teacher_own_enrollments_all"
  ON public.enrollments
  FOR ALL
  TO authenticated
  USING (
    (SELECT public.get_user_role()) = 'teacher'
    AND public.student_in_my_school(student_id)
    AND public.teaches_class(class_id)
  )
  WITH CHECK (
    (SELECT public.get_user_role()) = 'teacher'
    AND public.student_in_my_school(student_id)
    AND public.teaches_class(class_id)
  );

-- Parent links are an authorization grant. Require both sides of the link to
-- belong to the caller's school, and require the linked profile to be a parent.

CREATE OR REPLACE FUNCTION private.parent_in_my_school(p_parent_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = p_parent_id
        AND p.school_id = private.get_user_school_id()
        AND p.role = 'parent'
    );
$$;

REVOKE ALL ON FUNCTION private.parent_in_my_school(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.parent_in_my_school(UUID) TO authenticated, service_role;

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

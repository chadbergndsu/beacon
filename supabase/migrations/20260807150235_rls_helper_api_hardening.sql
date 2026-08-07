-- RLS helpers are implementation details, not public RPC endpoints. Keep them
-- in a schema that PostgREST does not expose while preserving their use from
-- stored row-level-security policies.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

ALTER FUNCTION public.get_user_role() SET SCHEMA private;
ALTER FUNCTION public.get_user_school_id() SET SCHEMA private;
ALTER FUNCTION public.is_school_leadership() SET SCHEMA private;
ALTER FUNCTION public.parent_of_student(UUID) SET SCHEMA private;
ALTER FUNCTION public.student_in_my_school(UUID) SET SCHEMA private;
ALTER FUNCTION public.teaches_class(UUID) SET SCHEMA private;

-- These helpers exist in a fully migrated schema but were absent from an early
-- manually assembled pilot. Move them when present; the private definitions
-- below are created either way.
DO $$
BEGIN
  IF to_regprocedure('public.is_parent_of(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.is_parent_of(UUID) SET SCHEMA private;
  END IF;
  IF to_regprocedure('public.parent_can_view_class(uuid)') IS NOT NULL THEN
    ALTER FUNCTION public.parent_can_view_class(UUID) SET SCHEMA private;
  END IF;
END
$$;

-- Standard migration order already creates this helper in private. The live
-- pilot predates that convention, so move its public version when necessary.
DO $$
BEGIN
  IF to_regprocedure('private.is_school_billing_admin()') IS NULL
     AND to_regprocedure('public.is_school_billing_admin()') IS NOT NULL THEN
    ALTER FUNCTION public.is_school_billing_admin() SET SCHEMA private;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.get_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.role
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.get_user_school_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.school_id
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_school_leadership()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND COALESCE(private.get_user_role() IN ('admin', 'staff', 'principal'), false);
$$;

CREATE OR REPLACE FUNCTION private.parent_of_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.parent_students ps
      WHERE ps.student_id = p_student_id
        AND ps.parent_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION private.is_parent_of(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.parent_students ps
      WHERE ps.student_id = p_student_id
        AND ps.parent_id = auth.uid()
    );
$$;

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

CREATE OR REPLACE FUNCTION private.parent_can_view_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.enrollments e
      JOIN public.parent_students ps ON ps.student_id = e.student_id
      WHERE e.class_id = p_class_id
        AND ps.parent_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION private.student_in_my_school(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.id = p_student_id
        AND s.school_id = private.get_user_school_id()
    );
$$;

CREATE OR REPLACE FUNCTION private.teaches_class(p_class_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.classes c
      WHERE c.id = p_class_id
        AND c.school_id = private.get_user_school_id()
        AND c.teacher_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION private.is_school_billing_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND COALESCE(private.get_user_role() IN ('admin', 'principal'), false);
$$;

REVOKE ALL ON FUNCTION private.get_user_role() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.get_user_school_id() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_school_leadership() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_parent_of(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.parent_in_my_school(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.parent_can_view_class(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.parent_of_student(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.student_in_my_school(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.teaches_class(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_school_billing_admin() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.get_user_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_user_school_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_school_leadership() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_parent_of(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.parent_in_my_school(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.parent_can_view_class(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.parent_of_student(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.student_in_my_school(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.teaches_class(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_school_billing_admin() TO authenticated, service_role;

-- The platform-managed event trigger function cannot be invoked usefully as an
-- RPC. Leave its schema and trigger binding untouched; only remove API-role
-- execution, and do not roll back application hardening if platform ownership
-- prevents that optional cleanup.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    BEGIN
      REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated, service_role;
    EXCEPTION
      WHEN insufficient_privilege THEN
        RAISE WARNING 'Could not revoke API execution on platform-managed rls_auto_enable()';
    END;
  END IF;
END
$$;

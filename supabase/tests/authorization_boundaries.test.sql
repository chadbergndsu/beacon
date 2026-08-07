BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;
SELECT plan(27);

INSERT INTO public.schools (id, name, slug) VALUES
  ('10000000-0000-0000-0000-000000000001', 'RLS Test School', 'rls-test-school'),
  ('10000000-0000-0000-0000-000000000002', 'Other School', 'other-school');

INSERT INTO auth.users (id, aud, role, email, created_at, updated_at) VALUES
  ('20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'principal@rls.test', now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'staff@rls.test', now(), now()),
  ('20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'teacher1@rls.test', now(), now()),
  ('20000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'teacher2@rls.test', now(), now()),
  ('20000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'parent@rls.test', now(), now()),
  ('20000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'teacher@other.test', now(), now()),
  ('20000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'parent@other.test', now(), now());

INSERT INTO public.profiles (id, school_id, role, full_name, email) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'principal', 'Principal', 'principal@rls.test'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'staff', 'Staff', 'staff@rls.test'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'teacher', 'Teacher One', 'teacher1@rls.test'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'teacher', 'Teacher Two', 'teacher2@rls.test'),
  ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'parent', 'Parent', 'parent@rls.test'),
  ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'teacher', 'Other Teacher', 'teacher@other.test'),
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'parent', 'Other Parent', 'parent@other.test');

INSERT INTO public.students (id, school_id, first_name, last_name) VALUES
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Student', 'One'),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Student', 'Two'),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Student', 'Three');

INSERT INTO public.classes (id, school_id, name, teacher_id) VALUES
  ('40000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Class One', '20000000-0000-0000-0000-000000000003'),
  ('40000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Class Two', '20000000-0000-0000-0000-000000000004'),
  ('40000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'Class Three', '20000000-0000-0000-0000-000000000006');

INSERT INTO public.enrollments (student_id, class_id) VALUES
  ('30000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000001'),
  ('30000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000002'),
  ('30000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000003');

INSERT INTO public.parent_students (parent_id, student_id) VALUES
  ('20000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000001');

INSERT INTO public.quickbooks_connections (
  school_id, status, access_token_encrypted, refresh_token_encrypted
) VALUES (
  '10000000-0000-0000-0000-000000000001', 'connected', 'secret-access', 'secret-refresh'
), (
  '10000000-0000-0000-0000-000000000002', 'connected', 'other-access', 'other-refresh'
);

INSERT INTO public.billing_products (id, school_id, name, amount_cents) VALUES
  ('50000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Tuition', 10000),
  ('50000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Other Tuition', 20000);

-- New Supabase projects no longer expose tables automatically. Grant the
-- authenticated role in this transaction so the assertions reach RLS itself.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.enrollments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_students TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quickbooks_connections TO authenticated;

SELECT is(
  (
    SELECT count(*)::int
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname IN (
        'get_user_role', 'get_user_school_id', 'is_school_leadership',
        'is_parent_of', 'parent_in_my_school', 'parent_can_view_class', 'parent_of_student',
        'student_in_my_school', 'teaches_class',
        'is_school_billing_admin'
      )
  ),
  10,
  'all RLS helpers live in the private schema'
);
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'get_user_role', 'get_user_school_id', 'is_school_leadership',
        'is_parent_of', 'parent_in_my_school', 'parent_can_view_class', 'parent_of_student',
        'student_in_my_school', 'teaches_class',
        'is_school_billing_admin'
      )
  ),
  0,
  'RLS helpers are absent from the public RPC schema'
);
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname IN (
        'get_user_role', 'get_user_school_id', 'is_school_leadership',
        'is_parent_of', 'parent_in_my_school', 'parent_can_view_class', 'parent_of_student',
        'student_in_my_school', 'teaches_class',
        'is_school_billing_admin'
      )
      AND has_function_privilege('anon', p.oid, 'EXECUTE')
  ),
  0,
  'anonymous requests cannot execute private RLS helpers'
);
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'private'
      AND p.proname IN (
        'get_user_role', 'get_user_school_id', 'is_school_leadership',
        'is_parent_of', 'parent_in_my_school', 'parent_can_view_class', 'parent_of_student',
        'student_in_my_school', 'teaches_class',
        'is_school_billing_admin'
      )
      AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
  ),
  10,
  'authenticated RLS evaluation retains helper execution'
);

SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
SELECT is((SELECT count(*)::int FROM public.students), 1, 'teacher sees only enrolled students');
SELECT is((SELECT id::text FROM public.students LIMIT 1), '30000000-0000-0000-0000-000000000001', 'teacher sees their enrolled student');
SELECT is((SELECT count(*)::int FROM public.classes), 1, 'teacher sees only owned classes');
SELECT is((SELECT count(*)::int FROM public.enrollments), 1, 'teacher sees only owned-class enrollments');
WITH changed AS (
  UPDATE public.classes SET name = 'Class One Updated'
  WHERE id = '40000000-0000-0000-0000-000000000001'
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 1, 'teacher can update an owned class');
WITH changed AS (
  UPDATE public.classes SET name = 'Hacked'
  WHERE id = '40000000-0000-0000-0000-000000000002'
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 0, 'teacher cannot update another teacher class');
WITH changed AS (
  UPDATE public.classes SET name = 'Cross-tenant hacked'
  WHERE id = '40000000-0000-0000-0000-000000000003'
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 0, 'teacher cannot update another school class');
WITH changed AS (
  UPDATE public.students SET medical_notes = 'Hacked'
  WHERE id = '30000000-0000-0000-0000-000000000002'
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 0, 'teacher cannot update another teacher student');
SELECT is((SELECT count(*)::int FROM public.billing_products), 0, 'teacher cannot read billing');
SELECT is((SELECT count(*)::int FROM public.quickbooks_connections), 0, 'teacher cannot read QuickBooks tokens');

SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
SELECT is((SELECT count(*)::int FROM public.students), 2, 'staff keeps school roster access');
SELECT ok(
  private.parent_in_my_school('20000000-0000-0000-0000-000000000005'),
  'staff can validate a same-school parent'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_students (parent_id, student_id) VALUES
    ('20000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000002')$$,
  '42501',
  'new row violates row-level security policy for table "parent_students"',
  'staff cannot link a local student to a parent from another school'
);
SELECT throws_ok(
  $$UPDATE public.parent_students
    SET parent_id = '20000000-0000-0000-0000-000000000007'
    WHERE parent_id = '20000000-0000-0000-0000-000000000005'
      AND student_id = '30000000-0000-0000-0000-000000000001'$$,
  '42501',
  'new row violates row-level security policy for table "parent_students"',
  'staff cannot move an existing link to a parent from another school'
);
SELECT is((SELECT count(*)::int FROM public.billing_products), 0, 'staff cannot read billing');
SELECT is((SELECT count(*)::int FROM public.quickbooks_connections), 0, 'staff cannot read QuickBooks tokens');
WITH changed AS (
  UPDATE public.students SET medical_notes = 'Cross-tenant hacked'
  WHERE id = '30000000-0000-0000-0000-000000000003'
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 0, 'staff cannot update another school student');
WITH changed AS (
  UPDATE public.billing_products SET amount_cents = 1
  WHERE id = '50000000-0000-0000-0000-000000000001'
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 0, 'staff cannot alter billing');

SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true);
SELECT is((SELECT count(*)::int FROM public.students), 1, 'parent sees only linked students');

SELECT set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
SELECT is((SELECT count(*)::int FROM public.billing_products), 1, 'principal can read billing');
SELECT is((SELECT access_token_encrypted FROM public.quickbooks_connections), 'secret-access', 'principal can read QuickBooks connection');
WITH changed AS (
  UPDATE public.billing_products SET amount_cents = 11000
  WHERE id = '50000000-0000-0000-0000-000000000001'
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 1, 'principal can alter billing');
WITH changed AS (
  UPDATE public.billing_products SET amount_cents = 1
  WHERE id = '50000000-0000-0000-0000-000000000002'
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 0, 'principal cannot alter another school billing');

SELECT * FROM finish();
ROLLBACK;

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;
SELECT plan(37);

INSERT INTO public.schools (id, name, slug) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Pilot Test School', 'pilot-test-school'),
  ('00000000-0000-0000-0000-000000000002', 'Other Pilot School', 'other-pilot-school');

INSERT INTO auth.users (id, aud, role, email, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000101', 'authenticated', 'authenticated', 'parent@pilot.test', now(), now()),
  ('00000000-0000-0000-0000-000000000102', 'authenticated', 'authenticated', 'teacher@pilot.test', now(), now()),
  ('00000000-0000-0000-0000-000000000103', 'authenticated', 'authenticated', 'principal@pilot.test', now(), now()),
  ('00000000-0000-0000-0000-000000000104', 'authenticated', 'authenticated', 'office-admin@pilot.test', now(), now()),
  ('00000000-0000-0000-0000-000000000105', 'authenticated', 'authenticated', 'office-staff@pilot.test', now(), now()),
  ('00000000-0000-0000-0000-000000000106', 'authenticated', 'authenticated', 'other-parent@pilot.test', now(), now()),
  ('00000000-0000-0000-0000-000000000201', 'authenticated', 'authenticated', 'parent@other-pilot.test', now(), now());

INSERT INTO public.profiles (id, school_id, role, full_name, email) VALUES
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'parent', 'Pilot Parent', 'parent@pilot.test'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'teacher', 'Pilot Teacher', 'teacher@pilot.test'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'principal', 'Pilot Principal', 'principal@pilot.test'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 'admin', 'Pilot Office Admin', 'office-admin@pilot.test'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 'staff', 'Pilot Office Staff', 'office-staff@pilot.test'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', 'parent', 'Second Pilot Parent', 'other-parent@pilot.test'),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000002', 'parent', 'Other School Parent', 'parent@other-pilot.test');

SELECT has_table('public', 'pilot_activity_daily', 'the daily pilot activity ledger exists');
SELECT has_table('public', 'parent_experience_feedback', 'the weekly parent feedback table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.pilot_activity_daily'::regclass),
  'the daily pilot activity ledger has RLS enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.parent_experience_feedback'::regclass),
  'the weekly parent feedback table has RLS enabled'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'pilot_activity_daily'
      AND column_name IN (
        'student_id', 'url', 'ip', 'ip_address', 'user_agent', 'notes', 'payload'
      )
  ),
  0,
  'the daily ledger cannot store student IDs, URLs, IPs, user agents, notes, or payloads'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS privilege
    WHERE has_table_privilege('anon', 'public.pilot_activity_daily', privilege)
  ),
  0,
  'anonymous callers have no daily-ledger privileges'
);
SELECT is(
  (
    SELECT count(*)::int
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS privilege
    WHERE has_table_privilege('authenticated', 'public.pilot_activity_daily', privilege)
  ),
  0,
  'authenticated callers have no daily-ledger privileges'
);
SELECT results_eq(
  $$
    SELECT privilege
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS privilege
    WHERE has_table_privilege('service_role', 'public.pilot_activity_daily', privilege)
    ORDER BY privilege
  $$,
  $$ VALUES ('INSERT'), ('SELECT') $$,
  'the service role has only SELECT and INSERT on the daily ledger'
);
SELECT is(
  (
    SELECT count(*)::int
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'pilot_activity_daily'
      AND roles && ARRAY['anon', 'authenticated']::name[]
  ),
  0,
  'the daily ledger has no client-access RLS policies'
);

SELECT is(
  (
    SELECT count(*)::int
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS privilege
    WHERE has_table_privilege('anon', 'public.parent_experience_feedback', privilege)
  ),
  0,
  'anonymous callers have no parent-feedback privileges'
);
SELECT results_eq(
  $$
    SELECT privilege
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS privilege
    WHERE has_table_privilege('authenticated', 'public.parent_experience_feedback', privilege)
    ORDER BY privilege
  $$,
  $$ VALUES ('INSERT'), ('SELECT'), ('UPDATE') $$,
  'authenticated callers have exactly SELECT, INSERT, and UPDATE on parent feedback'
);
SELECT results_eq(
  $$
    SELECT privilege
    FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) AS privilege
    WHERE has_table_privilege('service_role', 'public.parent_experience_feedback', privilege)
    ORDER BY privilege
  $$,
  $$ VALUES ('SELECT') $$,
  'the service role has read-only access to parent feedback'
);

INSERT INTO public.parent_experience_feedback
  (school_id, parent_id, rating, comment, surface, week_start)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000106',
    'helpful',
    'Another local parent response',
    'parent_dashboard',
    date_trunc('week', timezone('utc', now()))::date
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000201',
    'not_yet',
    'Other school response',
    'parent_dashboard',
    date_trunc('week', timezone('utc', now()))::date
  ),
  (
    '00000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000101',
    'not_yet',
    'Prior week response',
    'parent_dashboard',
    (date_trunc('week', timezone('utc', now())) - interval '7 days')::date
  );

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);

SELECT lives_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000101',
       'helpful', 'parent_dashboard', date_trunc('week', timezone('utc', now()))::date)$$,
  'a parent can submit their own current-week response'
);
SELECT is(
  (SELECT count(*)::int FROM public.parent_experience_feedback),
  1,
  'a parent can select only their own current-week response'
);
WITH changed AS (
  UPDATE public.parent_experience_feedback
  SET rating = 'not_yet', comment = 'Updated by the parent'
  WHERE parent_id = '00000000-0000-0000-0000-000000000101'
    AND week_start = date_trunc('week', timezone('utc', now()))::date
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 1, 'a parent can update their current-week response');
WITH changed AS (
  UPDATE public.parent_experience_feedback
  SET rating = 'helpful'
  WHERE parent_id = '00000000-0000-0000-0000-000000000101'
    AND week_start = (date_trunc('week', timezone('utc', now())) - interval '7 days')::date
  RETURNING 1
)
SELECT is((SELECT count(*)::int FROM changed), 0, 'a parent cannot update a prior-week response');

SELECT throws_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000106',
       'helpful', 'parent_dashboard', date_trunc('week', timezone('utc', now()))::date)$$,
  '42501',
  'new row violates row-level security policy for table "parent_experience_feedback"',
  'a parent cannot submit feedback as another parent'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000002',
       '00000000-0000-0000-0000-000000000101',
       'helpful', 'parent_dashboard', date_trunc('week', timezone('utc', now()))::date)$$,
  'new row violates row-level security policy for table "parent_experience_feedback"',
  'a parent cannot submit feedback into another school'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000101',
       'helpful', 'parent_dashboard',
       (date_trunc('week', timezone('utc', now())) + interval '7 days')::date)$$,
  '42501',
  'new row violates row-level security policy for table "parent_experience_feedback"',
  'a parent cannot submit future-week feedback'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000101',
       'helpful', 'parent_dashboard',
       (date_trunc('week', timezone('utc', now())) - interval '7 days')::date)$$,
  '42501',
  'new row violates row-level security policy for table "parent_experience_feedback"',
  'a parent cannot submit past-week feedback'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000101',
       'helpful', 'parent_dashboard', date_trunc('week', timezone('utc', now()))::date)$$,
  '23505',
  NULL,
  'a parent cannot submit a second response for the same week and surface'
);
SELECT throws_ok(
  $$UPDATE public.parent_experience_feedback
    SET parent_id = '00000000-0000-0000-0000-000000000106'
    WHERE parent_id = '00000000-0000-0000-0000-000000000101'
      AND week_start = date_trunc('week', timezone('utc', now()))::date$$,
  '42501',
  'new row violates row-level security policy for table "parent_experience_feedback"',
  'a parent cannot reassign a response to another parent'
);
SELECT throws_ok(
  $$UPDATE public.parent_experience_feedback
    SET school_id = '00000000-0000-0000-0000-000000000002'
    WHERE parent_id = '00000000-0000-0000-0000-000000000101'
      AND week_start = date_trunc('week', timezone('utc', now()))::date$$,
  '42501',
  'new row violates row-level security policy for table "parent_experience_feedback"',
  'a parent cannot move a response to another school'
);
SELECT throws_ok(
  $$UPDATE public.parent_experience_feedback
    SET week_start = (date_trunc('week', timezone('utc', now())) + interval '7 days')::date
    WHERE parent_id = '00000000-0000-0000-0000-000000000101'
      AND week_start = date_trunc('week', timezone('utc', now()))::date$$,
  '42501',
  'new row violates row-level security policy for table "parent_experience_feedback"',
  'a parent cannot move a response to another week'
);

SELECT throws_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000101',
       'excellent', 'parent_dashboard', date_trunc('week', timezone('utc', now()))::date)$$,
  '23514',
  NULL,
  'parent feedback rejects an unsupported rating'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, comment, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000101',
       'helpful', repeat('x', 501), 'parent_dashboard',
       date_trunc('week', timezone('utc', now()))::date)$$,
  '23514',
  NULL,
  'parent feedback rejects a comment longer than 500 characters'
);
SELECT throws_ok(
  $$INSERT INTO public.parent_experience_feedback
      (school_id, parent_id, rating, surface, week_start)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000101',
       'helpful', 'email', date_trunc('week', timezone('utc', now()))::date)$$,
  '23514',
  NULL,
  'parent feedback rejects an unsupported surface'
);

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
SELECT is((SELECT count(*)::int FROM public.parent_experience_feedback), 3, 'a principal reads all feedback from their school');
SELECT is((SELECT count(*)::int FROM public.parent_experience_feedback WHERE school_id = '00000000-0000-0000-0000-000000000002'), 0, 'a principal cannot read another school feedback');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
SELECT is((SELECT count(*)::int FROM public.parent_experience_feedback), 3, 'an office admin reads all feedback from their school');
SELECT is((SELECT count(*)::int FROM public.parent_experience_feedback WHERE school_id = '00000000-0000-0000-0000-000000000002'), 0, 'an office admin cannot read another school feedback');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
SELECT is((SELECT count(*)::int FROM public.parent_experience_feedback), 0, 'a teacher cannot read parent feedback');

SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000105', true);
SELECT is((SELECT count(*)::int FROM public.parent_experience_feedback), 0, 'office staff cannot read parent feedback');

RESET ROLE;
SET LOCAL ROLE service_role;

SELECT lives_ok(
  $$INSERT INTO public.pilot_activity_daily
      (school_id, user_id, actor_role, event_type, activity_date)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000102',
       'teacher', 'teacher_work', current_date)$$,
  'the server role can record daily pilot activity'
);
SELECT is((SELECT count(*)::int FROM public.pilot_activity_daily), 1, 'the server role can read the daily pilot ledger');
SELECT throws_ok(
  $$INSERT INTO public.pilot_activity_daily
      (school_id, user_id, actor_role, event_type, activity_date)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000102',
       'teacher', 'page_view', current_date)$$,
  '23514',
  NULL,
  'the daily ledger rejects an unsupported activity event'
);
SELECT throws_ok(
  $$INSERT INTO public.pilot_activity_daily
      (school_id, user_id, actor_role, event_type, activity_date)
    VALUES
      ('00000000-0000-0000-0000-000000000001',
       '00000000-0000-0000-0000-000000000102',
       'student', 'sign_in', current_date)$$,
  '23514',
  NULL,
  'the daily ledger rejects an unsupported actor role'
);

SELECT * FROM finish();
ROLLBACK;

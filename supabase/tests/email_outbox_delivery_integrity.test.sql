BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;
SELECT plan(9);

SELECT has_column('public', 'email_outbox', 'sender_id', 'outbox records originating sender');
SELECT has_column('public', 'email_outbox', 'attempt_key', 'outbox records durable attempt key');
SELECT col_is_fk('public', 'email_outbox', 'sender_id', 'sender is constrained to a profile');

INSERT INTO public.schools (id, name, slug) VALUES
  ('91000000-0000-4000-8000-000000000001', 'Outbox School', 'outbox-school'),
  ('91000000-0000-4000-8000-000000000002', 'Other Outbox School', 'other-outbox-school');

INSERT INTO auth.users (id, aud, role, email, created_at, updated_at) VALUES
  ('92000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'leader@outbox.test', now(), now()),
  ('92000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'teacher1@outbox.test', now(), now()),
  ('92000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated', 'teacher2@outbox.test', now(), now()),
  ('92000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated', 'parent@outbox.test', now(), now()),
  ('92000000-0000-4000-8000-000000000005', 'authenticated', 'authenticated', 'other@outbox.test', now(), now());

INSERT INTO public.profiles (id, school_id, role, full_name, email) VALUES
  ('92000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', 'principal', 'Leader', 'leader@outbox.test'),
  ('92000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000001', 'teacher', 'Teacher One', 'teacher1@outbox.test'),
  ('92000000-0000-4000-8000-000000000003', '91000000-0000-4000-8000-000000000001', 'teacher', 'Teacher Two', 'teacher2@outbox.test'),
  ('92000000-0000-4000-8000-000000000004', '91000000-0000-4000-8000-000000000001', 'parent', 'Parent', 'parent@outbox.test'),
  ('92000000-0000-4000-8000-000000000005', '91000000-0000-4000-8000-000000000002', 'teacher', 'Other Teacher', 'other@outbox.test');

INSERT INTO public.email_outbox (
  id, school_id, sender_id, attempt_key, kind, to_email, subject, body_text, status
) VALUES
  ('93000000-0000-4000-8000-000000000001', '91000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000001', 'message', 'one@recipient.test', 'One', 'Private one', 'failed'),
  ('93000000-0000-4000-8000-000000000002', '91000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000003', '94000000-0000-4000-8000-000000000002', 'message', 'two@recipient.test', 'Two', 'Private two', 'skipped');

SELECT throws_ok(
  $$INSERT INTO public.email_outbox (school_id, sender_id, attempt_key, kind, to_email, subject, body_text)
    VALUES ('91000000-0000-4000-8000-000000000001', '92000000-0000-4000-8000-000000000002', '94000000-0000-4000-8000-000000000001', 'message', 'ONE@RECIPIENT.TEST', 'Replay', 'Replay')$$,
  '23505',
  NULL,
  'recipient claim is unique across email case'
);

GRANT SELECT ON public.email_outbox TO authenticated;
SET LOCAL ROLE authenticated;

SELECT set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.email_outbox), 1, 'teacher sees only sender-owned rows');
SELECT is((SELECT count(*)::int FROM public.email_outbox WHERE id = '93000000-0000-4000-8000-000000000002'), 0, 'teacher cannot see another teacher row');

SELECT set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.email_outbox), 2, 'leadership sees school-wide rows');

SELECT set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000005","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.email_outbox), 0, 'cross-school teacher sees no rows');

SELECT set_config('request.jwt.claims', '{"sub":"92000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
SELECT is((SELECT count(*)::int FROM public.email_outbox), 0, 'parents see no outbox rows');

SELECT * FROM finish();
ROLLBACK;

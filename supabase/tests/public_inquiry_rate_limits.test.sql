BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path = public, extensions;
SELECT plan(15);

SELECT has_function(
  'public',
  'consume_public_inquiry_rate_limits',
  ARRAY['text[]', 'integer[]', 'integer'],
  'durable public inquiry limiter exists'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.consume_public_inquiry_rate_limits(text[],integer[],integer)',
    'EXECUTE'
  ),
  'anonymous callers cannot consume rate-limit buckets directly'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.consume_public_inquiry_rate_limits(text[],integer[],integer)',
    'EXECUTE'
  ),
  'authenticated callers cannot consume rate-limit buckets directly'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.consume_public_inquiry_rate_limits(text[],integer[],integer)',
    'EXECUTE'
  ),
  'the backend service role can consume rate-limit buckets'
);

SELECT has_function(
  'public',
  'public_inquiry_rate_limit_ready',
  ARRAY[]::text[],
  'public inquiry readiness probe exists'
);

SELECT ok(
  NOT has_function_privilege('anon', 'public.public_inquiry_rate_limit_ready()', 'EXECUTE'),
  'anonymous callers cannot execute the readiness probe'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.public_inquiry_rate_limit_ready()',
    'EXECUTE'
  ),
  'authenticated callers cannot execute the readiness probe'
);

SELECT ok(
  has_function_privilege('service_role', 'public.public_inquiry_rate_limit_ready()', 'EXECUTE'),
  'the backend service role can execute the readiness probe'
);

SET LOCAL ROLE service_role;

SELECT ok(
  public.public_inquiry_rate_limit_ready(),
  'the readiness probe confirms the durable limiter table'
);

SELECT ok(
  public.consume_public_inquiry_rate_limits(
    ARRAY['test-ip-global', 'test-ip-a', 'test-email-a'],
    ARRAY[20, 2, 1],
    3600
  ),
  'first inquiry is accepted'
);

SELECT ok(
  public.consume_public_inquiry_rate_limits(
    ARRAY['test-ip-global', 'test-ip-a', 'test-email-b'],
    ARRAY[20, 2, 1],
    3600
  ),
  'rotating email remains allowed only until the independent IP ceiling'
);

SELECT is(
  public.consume_public_inquiry_rate_limits(
    ARRAY['test-ip-global', 'test-ip-a', 'test-email-c'],
    ARRAY[20, 2, 1],
    3600
  ),
  false,
  'rotating email cannot bypass the independent IP ceiling'
);

SELECT ok(
  public.consume_public_inquiry_rate_limits(
    ARRAY['test-atomic-global', 'test-atomic-open', 'test-atomic-blocked'],
    ARRAY[20, 1, 1],
    3600
  ),
  'control request primes a limited bucket'
);

SELECT is(
  public.consume_public_inquiry_rate_limits(
    ARRAY['test-atomic-global', 'test-atomic-fresh', 'test-atomic-blocked'],
    ARRAY[20, 1, 1],
    3600
  ),
  false,
  'a denied multi-key request does not pass when one bucket is exhausted'
);

SELECT ok(
  public.consume_public_inquiry_rate_limits(
    ARRAY['test-atomic-fresh'],
    ARRAY[1],
    3600
  ),
  'a denied multi-key request does not consume its otherwise-fresh buckets'
);

SELECT * FROM finish();
ROLLBACK;

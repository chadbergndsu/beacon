-- Durable, atomic fixed-window limits for the unauthenticated design-partner
-- inquiry. The public function is callable only by the backend service role;
-- browser roles cannot inspect or consume buckets.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;

CREATE TABLE IF NOT EXISTS private.public_inquiry_rate_limits (
  bucket_key TEXT NOT NULL,
  window_started_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL CHECK (attempts > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (bucket_key, window_started_at)
);

REVOKE ALL ON TABLE private.public_inquiry_rate_limits FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.consume_public_inquiry_rate_limits(
  p_keys TEXT[],
  p_limits INTEGER[],
  p_window_seconds INTEGER DEFAULT 3600
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_window_started_at TIMESTAMPTZ;
  v_attempts INTEGER;
BEGIN
  IF p_keys IS NULL
     OR p_limits IS NULL
     OR cardinality(p_keys) = 0
     OR cardinality(p_keys) <> cardinality(p_limits)
     OR p_window_seconds < 60
     OR EXISTS (SELECT 1 FROM unnest(p_keys) AS key_value WHERE key_value IS NULL OR length(key_value) > 160)
     OR EXISTS (SELECT 1 FROM unnest(p_limits) AS limit_value WHERE limit_value < 1) THEN
    RAISE EXCEPTION 'invalid public inquiry rate-limit arguments';
  END IF;

  v_window_started_at := to_timestamp(
    floor(extract(epoch FROM v_now) / p_window_seconds) * p_window_seconds
  );

  -- Serialize this low-volume public boundary so a burst across serverless
  -- instances cannot race past the global or identity-specific ceilings.
  PERFORM pg_advisory_xact_lock(hashtextextended('beacon-public-inquiry-rate-limit', 0));

  DELETE FROM private.public_inquiry_rate_limits
  WHERE expires_at < v_now - interval '1 hour';

  FOR v_index IN 1..cardinality(p_keys) LOOP
    SELECT attempts
    INTO v_attempts
    FROM private.public_inquiry_rate_limits
    WHERE bucket_key = p_keys[v_index]
      AND window_started_at = v_window_started_at;

    IF COALESCE(v_attempts, 0) >= p_limits[v_index] THEN
      RETURN false;
    END IF;
  END LOOP;

  FOR v_index IN 1..cardinality(p_keys) LOOP
    INSERT INTO private.public_inquiry_rate_limits (
      bucket_key,
      window_started_at,
      attempts,
      expires_at
    )
    VALUES (
      p_keys[v_index],
      v_window_started_at,
      1,
      v_window_started_at + make_interval(secs => p_window_seconds)
    )
    ON CONFLICT (bucket_key, window_started_at)
    DO UPDATE SET attempts = private.public_inquiry_rate_limits.attempts + 1;
  END LOOP;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_public_inquiry_rate_limits(TEXT[], INTEGER[], INTEGER)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_public_inquiry_rate_limits(TEXT[], INTEGER[], INTEGER)
TO service_role;

CREATE OR REPLACE FUNCTION public.public_inquiry_rate_limit_ready()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT to_regclass('private.public_inquiry_rate_limits') IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.public_inquiry_rate_limit_ready()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.public_inquiry_rate_limit_ready()
TO service_role;

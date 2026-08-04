-- Paste in Supabase SQL Editor if not using npm run db:migrate.
-- Canonical: supabase/migrations/018_access_token_expiry.sql

ALTER TABLE school_access_tokens
  ADD COLUMN IF NOT EXISTS kiosk_token_expires_at TIMESTAMPTZ;

ALTER TABLE school_access_tokens
  ADD COLUMN IF NOT EXISTS device_token_expires_at TIMESTAMPTZ;

UPDATE school_access_tokens
SET
  kiosk_token_expires_at = COALESCE(kiosk_token_expires_at, NOW() + INTERVAL '90 days'),
  device_token_expires_at = COALESCE(device_token_expires_at, NOW() + INTERVAL '90 days'),
  updated_at = NOW()
WHERE kiosk_token_expires_at IS NULL
   OR device_token_expires_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_school_access_kiosk_exp
  ON school_access_tokens (kiosk_token_expires_at);

CREATE INDEX IF NOT EXISTS idx_school_access_device_exp
  ON school_access_tokens (device_token_expires_at);

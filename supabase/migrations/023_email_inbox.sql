-- Family email replies: correlate outbound → inbound and log parent replies in-app.
-- Outbound Reply-To uses reply+{token}@EMAIL_INBOUND_DOMAIN when inbound is configured.

ALTER TABLE email_outbox
  ADD COLUMN IF NOT EXISTS reply_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_outbox_reply_token
  ON email_outbox (reply_token)
  WHERE reply_token IS NOT NULL;

CREATE TABLE IF NOT EXISTS email_inbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  outbox_id UUID REFERENCES email_outbox(id) ON DELETE SET NULL,
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL DEFAULT '',
  body_html TEXT,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN ('received', 'reviewed', 'archived', 'spam')),
  provider TEXT,
  provider_message_id TEXT,
  reply_token TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_inbox_school_created
  ON email_inbox (school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_email_inbox_outbox
  ON email_inbox (outbox_id)
  WHERE outbox_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_email_inbox_status
  ON email_inbox (school_id, status);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_inbox_provider_msg
  ON email_inbox (provider, provider_message_id)
  WHERE provider_message_id IS NOT NULL AND provider IS NOT NULL;

ALTER TABLE email_inbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view school email inbox" ON email_inbox;
CREATE POLICY "Staff view school email inbox" ON email_inbox FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'teacher', 'principal')
  );

-- Parents may read their own replies (matched by profile email) for the family thread UI.
DROP POLICY IF EXISTS "Parents view own email replies" ON email_inbox;
CREATE POLICY "Parents view own email replies" ON email_inbox FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() = 'parent'
    AND lower(from_email) = lower(COALESCE(
      (SELECT email FROM profiles WHERE id = auth.uid()),
      ''
    ))
  );

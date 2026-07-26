-- System email outbox for Beacon announcements & notifications
CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id),
  kind TEXT NOT NULL DEFAULT 'announcement',
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  body_html TEXT,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'sent', 'failed', 'skipped')),
  provider TEXT,
  error TEXT,
  related_table TEXT,
  related_id UUID,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_email_outbox_school ON email_outbox(school_id);
CREATE INDEX IF NOT EXISTS idx_email_outbox_status ON email_outbox(status);
CREATE INDEX IF NOT EXISTS idx_email_outbox_created ON email_outbox(created_at DESC);

ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff view school email outbox" ON email_outbox;
CREATE POLICY "Staff view school email outbox" ON email_outbox FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'teacher')
  );

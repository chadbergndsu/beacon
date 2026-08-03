-- Communications hardening: principal can read outbox; ensure kinds stay free-form text
-- (email kinds are application-level: announcement, message, dinner_digest, etc.)

DROP POLICY IF EXISTS "Staff view school email outbox" ON email_outbox;
CREATE POLICY "Staff view school email outbox" ON email_outbox FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'teacher', 'principal')
  );

-- Helpful index for filtering failed sends in the Comms UI
CREATE INDEX IF NOT EXISTS idx_email_outbox_kind ON email_outbox(kind);

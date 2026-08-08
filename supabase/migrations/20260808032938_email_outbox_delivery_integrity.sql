-- Add durable delivery claims and originating sender ownership to the existing outbox.
-- Legacy/system callers remain valid because both columns are nullable.
ALTER TABLE public.email_outbox
  ADD COLUMN IF NOT EXISTS sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS attempt_key UUID;

CREATE INDEX IF NOT EXISTS idx_email_outbox_school_sender_created
  ON public.email_outbox (school_id, sender_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_email_outbox_delivery_claim
  ON public.email_outbox (school_id, attempt_key, lower(to_email))
  WHERE school_id IS NOT NULL AND attempt_key IS NOT NULL;

DROP POLICY IF EXISTS "Staff view school email outbox" ON public.email_outbox;
DROP POLICY IF EXISTS "Faculty view permitted email outbox" ON public.email_outbox;
CREATE POLICY "Faculty view permitted email outbox"
  ON public.email_outbox
  FOR SELECT
  TO authenticated
  USING (
    school_id = (SELECT private.get_user_school_id())
    AND (
      (SELECT private.get_user_role()) IN ('admin', 'staff', 'principal')
      OR (
        (SELECT private.get_user_role()) = 'teacher'
        AND sender_id = (SELECT auth.uid())
      )
    )
  );

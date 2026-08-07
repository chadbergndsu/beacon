-- Native family billing (Beacon-owned — no third-party biller lock-in)
-- Portal pay links, reminders, payment plans, recurring schedules.
-- Safe to re-run.

-- ========== Invoice portal + reminders ==========
ALTER TABLE billing_invoices
  ADD COLUMN IF NOT EXISTS portal_token TEXT;

ALTER TABLE billing_invoices
  ADD COLUMN IF NOT EXISTS last_reminded_at TIMESTAMPTZ;

ALTER TABLE billing_invoices
  ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE billing_invoices
  ADD COLUMN IF NOT EXISTS plan_id UUID;

ALTER TABLE billing_invoices
  ADD COLUMN IF NOT EXISTS installment_index INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_invoices_portal_token
  ON billing_invoices (portal_token)
  WHERE portal_token IS NOT NULL;

-- ========== Payment plans (split large balances) ==========
CREATE TABLE IF NOT EXISTS billing_payment_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  family_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  description TEXT NOT NULL,
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  installment_count INTEGER NOT NULL CHECK (installment_count >= 2 AND installment_count <= 24),
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_plans_school ON billing_payment_plans(school_id);

-- FK after table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'billing_invoices_plan_id_fkey'
  ) THEN
    ALTER TABLE billing_invoices
      ADD CONSTRAINT billing_invoices_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES billing_payment_plans(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ========== Recurring billing schedules (tuition auto-invoice) ==========
CREATE TABLE IF NOT EXISTS billing_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  product_id UUID REFERENCES billing_products(id) ON DELETE SET NULL,
  family_name TEXT NOT NULL,
  parent_email TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('monthly', 'term', 'annual')),
  next_run_on DATE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_schedules_due
  ON billing_schedules (school_id, active, next_run_on);

-- Policy helpers live outside the exposed Data API schema. Defining this here
-- also keeps a manually assembled pilot safe if migration 019 is applied late.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_school_billing_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'principal')
    );
$$;
REVOKE ALL ON FUNCTION private.is_school_billing_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_school_billing_admin() TO authenticated, service_role;

ALTER TABLE billing_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leadership manage payment plans" ON billing_payment_plans;
CREATE POLICY "Leadership manage payment plans" ON billing_payment_plans FOR ALL
  TO authenticated
  USING (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
    AND private.is_school_billing_admin()
  )
  WITH CHECK (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
    AND private.is_school_billing_admin()
  );

DROP POLICY IF EXISTS "Leadership manage schedules" ON billing_schedules;
CREATE POLICY "Leadership manage schedules" ON billing_schedules FOR ALL
  TO authenticated
  USING (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
    AND private.is_school_billing_admin()
  )
  WITH CHECK (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
    AND private.is_school_billing_admin()
  );

-- Parents can read open invoices for their email (portal uses service role; this is app RLS)
DROP POLICY IF EXISTS "Parents read own invoices" ON billing_invoices;
CREATE POLICY "Parents read own invoices" ON billing_invoices
  FOR SELECT
  USING (
    school_id = (SELECT p.school_id FROM public.profiles p WHERE p.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'parent'
    )
    AND parent_email IS NOT NULL
    AND lower(parent_email) = lower(COALESCE(
      (SELECT email FROM profiles WHERE id = auth.uid()),
      ''
    ))
  );

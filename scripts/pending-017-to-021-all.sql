-- Beacon go-live: migrations 017–021 (safe IF NOT EXISTS / IF EXISTS)
-- Paste into Supabase SQL Editor: https://supabase.com/dashboard/project/lqswgkjotjmltoyfnggj/sql/new
-- Generated 2026-08-05T00:11Z


-- ========== 017_billing_first_class.sql ==========
-- First-class billing: durable product/invoice/payment/QB rows (not schools.settings JSON).
-- Safe to re-run.

-- ========== 1) QuickBooks: allow honest "demo" status ==========
ALTER TABLE quickbooks_connections DROP CONSTRAINT IF EXISTS quickbooks_connections_status_check;
ALTER TABLE quickbooks_connections
  ADD CONSTRAINT quickbooks_connections_status_check
  CHECK (status IN ('disconnected', 'pending', 'connected', 'demo', 'error'));

-- ========== 2) Products: stable per-school code (aftercare, tuition seeds) ==========
ALTER TABLE billing_products
  ADD COLUMN IF NOT EXISTS code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_products_school_code
  ON billing_products (school_id, code)
  WHERE code IS NOT NULL;

-- ========== 3) Invoices: source_key for idempotent aftercare / rebill safety ==========
ALTER TABLE billing_invoices
  ADD COLUMN IF NOT EXISTS source_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_invoices_school_source
  ON billing_invoices (school_id, source_key)
  WHERE source_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_invoices_parent_email
  ON billing_invoices (school_id, lower(parent_email));

CREATE INDEX IF NOT EXISTS idx_billing_invoices_status
  ON billing_invoices (school_id, status);

-- ========== 4) Parent SELECT: families see invoices emailed to them ==========
DROP POLICY IF EXISTS "Parents read own invoices" ON billing_invoices;
CREATE POLICY "Parents read own invoices" ON billing_invoices
  FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() = 'parent'
    AND parent_email IS NOT NULL
    AND lower(parent_email) = lower(COALESCE(
      (SELECT email FROM profiles WHERE id = auth.uid()),
      ''
    ))
  );

DROP POLICY IF EXISTS "Parents read own payments" ON billing_payments;
CREATE POLICY "Parents read own payments" ON billing_payments
  FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() = 'parent'
    AND invoice_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM billing_invoices i
      WHERE i.id = billing_payments.invoice_id
        AND i.school_id = billing_payments.school_id
        AND i.parent_email IS NOT NULL
        AND lower(i.parent_email) = lower(COALESCE(
          (SELECT email FROM profiles WHERE id = auth.uid()),
          ''
        ))
    )
  );

-- ========== 5) One-time migrate schools.settings.billing → tables (if any) ==========
-- Products
INSERT INTO billing_products (
  id, school_id, name, description, amount_cents, currency, frequency, active, qb_item_id, code
)
SELECT
  CASE
    WHEN (p->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (p->>'id')::uuid
    ELSE uuid_generate_v4()
  END,
  s.id,
  COALESCE(p->>'name', 'Product'),
  COALESCE(p->>'description', ''),
  GREATEST(0, COALESCE((p->>'amountCents')::int, 0)),
  COALESCE(p->>'currency', 'USD'),
  CASE
    WHEN p->>'frequency' IN ('one_time', 'monthly', 'term', 'annual') THEN p->>'frequency'
    ELSE 'monthly'
  END,
  COALESCE((p->>'active')::boolean, true),
  p->>'qbItemId',
  CASE
    WHEN p->>'id' = 'prod_aftercare' THEN 'aftercare'
    WHEN p->>'id' = 'prod_tuition_k5' THEN 'tuition_k5'
    WHEN p->>'id' = 'prod_tuition_ms' THEN 'tuition_ms'
    WHEN p->>'id' = 'prod_registration' THEN 'registration'
    WHEN p->>'code' IS NOT NULL AND length(p->>'code') > 0 THEN p->>'code'
    ELSE NULL
  END
FROM schools s
CROSS JOIN LATERAL jsonb_array_elements(
  COALESCE(s.settings->'billing'->'products', '[]'::jsonb)
) AS p
WHERE COALESCE(jsonb_array_length(s.settings->'billing'->'products'), 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM billing_products bp WHERE bp.school_id = s.id LIMIT 1
  )
ON CONFLICT DO NOTHING;

-- Invoices (map non-UUID string ids to new UUIDs; keep description/status)
INSERT INTO billing_invoices (
  id, school_id, student_id, family_name, parent_email, product_id,
  description, amount_cents, currency, status, due_date, qb_invoice_id, created_at, source_key
)
SELECT
  CASE
    WHEN (inv->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (inv->>'id')::uuid
    ELSE uuid_generate_v4()
  END,
  s.id,
  CASE
    WHEN (inv->>'studentId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (inv->>'studentId')::uuid
    ELSE NULL
  END,
  COALESCE(inv->>'familyName', 'Family'),
  COALESCE(inv->>'parentEmail', ''),
  CASE
    WHEN (inv->>'productId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (inv->>'productId')::uuid
    ELSE NULL
  END,
  COALESCE(inv->>'description', 'Invoice'),
  GREATEST(0, COALESCE((inv->>'amountCents')::int, 0)),
  COALESCE(inv->>'currency', 'USD'),
  CASE
    WHEN inv->>'status' IN ('draft', 'open', 'paid', 'void', 'overdue', 'syncing')
      THEN inv->>'status'
    ELSE 'open'
  END,
  CASE
    WHEN inv->>'dueDate' IS NOT NULL AND length(inv->>'dueDate') >= 8
      THEN (inv->>'dueDate')::date
    ELSE NULL
  END,
  inv->>'qbInvoiceId',
  COALESCE((inv->>'createdAt')::timestamptz, NOW()),
  CASE
    WHEN inv->>'id' LIKE 'inv_ac_%' THEN 'aftercare_session:' || substring(inv->>'id' from 8)
    WHEN inv->>'sourceKey' IS NOT NULL THEN inv->>'sourceKey'
    ELSE COALESCE(inv->>'id', NULL)
  END
FROM schools s
CROSS JOIN LATERAL jsonb_array_elements(
  COALESCE(s.settings->'billing'->'invoices', '[]'::jsonb)
) AS inv
WHERE COALESCE(jsonb_array_length(s.settings->'billing'->'invoices'), 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM billing_invoices bi WHERE bi.school_id = s.id LIMIT 1
  )
ON CONFLICT DO NOTHING;

-- Payments
INSERT INTO billing_payments (
  id, school_id, invoice_id, amount_cents, currency, method, status, paid_at, qb_payment_id, notes, created_at
)
SELECT
  CASE
    WHEN (pay->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (pay->>'id')::uuid
    ELSE uuid_generate_v4()
  END,
  s.id,
  CASE
    WHEN (pay->>'invoiceId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (pay->>'invoiceId')::uuid
    ELSE NULL
  END,
  GREATEST(0, COALESCE((pay->>'amountCents')::int, 0)),
  COALESCE(pay->>'currency', 'USD'),
  CASE
    WHEN pay->>'method' IN ('card', 'ach', 'check', 'cash', 'other', 'quickbooks')
      THEN pay->>'method'
    ELSE 'other'
  END,
  CASE
    WHEN pay->>'status' IN ('pending', 'succeeded', 'failed', 'refunded', 'syncing')
      THEN pay->>'status'
    ELSE 'succeeded'
  END,
  CASE
    WHEN pay->>'paidAt' IS NOT NULL THEN (pay->>'paidAt')::timestamptz
    ELSE NULL
  END,
  pay->>'qbPaymentId',
  pay->>'notes',
  COALESCE((pay->>'createdAt')::timestamptz, NOW())
FROM schools s
CROSS JOIN LATERAL jsonb_array_elements(
  COALESCE(s.settings->'billing'->'payments', '[]'::jsonb)
) AS pay
WHERE COALESCE(jsonb_array_length(s.settings->'billing'->'payments'), 0) > 0
  AND NOT EXISTS (
    SELECT 1 FROM billing_payments bp WHERE bp.school_id = s.id LIMIT 1
  )
ON CONFLICT DO NOTHING;

-- QuickBooks connection metadata from settings.billing.quickbooks (tokens stay in qbTokens or columns)
INSERT INTO quickbooks_connections (
  school_id, status, environment, realm_id, company_name,
  last_sync_at, last_error, sync_customers, sync_invoices, sync_payments,
  connected_at, updated_at
)
SELECT
  s.id,
  CASE
    WHEN s.settings->'billing'->'quickbooks'->>'status' IN (
      'disconnected', 'pending', 'connected', 'demo', 'error'
    ) THEN s.settings->'billing'->'quickbooks'->>'status'
    ELSE 'disconnected'
  END,
  CASE
    WHEN s.settings->'billing'->'quickbooks'->>'environment' = 'production' THEN 'production'
    ELSE 'sandbox'
  END,
  s.settings->'billing'->'quickbooks'->>'realmId',
  s.settings->'billing'->'quickbooks'->>'companyName',
  CASE
    WHEN s.settings->'billing'->'quickbooks'->>'lastSyncAt' IS NOT NULL
      THEN (s.settings->'billing'->'quickbooks'->>'lastSyncAt')::timestamptz
    ELSE NULL
  END,
  s.settings->'billing'->'quickbooks'->>'lastError',
  COALESCE((s.settings->'billing'->'quickbooks'->>'syncCustomers')::boolean, true),
  COALESCE((s.settings->'billing'->'quickbooks'->>'syncInvoices')::boolean, true),
  COALESCE((s.settings->'billing'->'quickbooks'->>'syncPayments')::boolean, true),
  CASE
    WHEN s.settings->'billing'->'quickbooks'->>'connectedAt' IS NOT NULL
      THEN (s.settings->'billing'->'quickbooks'->>'connectedAt')::timestamptz
    ELSE NULL
  END,
  NOW()
FROM schools s
WHERE s.settings ? 'billing'
  AND s.settings->'billing' ? 'quickbooks'
  AND NOT EXISTS (
    SELECT 1 FROM quickbooks_connections q WHERE q.school_id = s.id
  )
ON CONFLICT (school_id) DO NOTHING;

-- Copy vaulted tokens from settings.qbTokens into connection row when present
UPDATE quickbooks_connections q
SET
  access_token_encrypted = s.settings->'qbTokens'->>'accessToken',
  refresh_token_encrypted = s.settings->'qbTokens'->>'refreshToken',
  token_expires_at = CASE
    WHEN (s.settings->'qbTokens'->>'expiresAt') ~ '^[0-9]+$'
      THEN to_timestamp(((s.settings->'qbTokens'->>'expiresAt')::bigint) / 1000.0)
    ELSE q.token_expires_at
  END,
  realm_id = COALESCE(q.realm_id, s.settings->'qbTokens'->>'realmId'),
  updated_at = NOW()
FROM schools s
WHERE q.school_id = s.id
  AND s.settings ? 'qbTokens'
  AND COALESCE(s.settings->'qbTokens'->>'accessToken', '') <> ''
  AND COALESCE(q.access_token_encrypted, '') = '';


-- ========== 018_access_token_expiry.sql ==========
-- Kiosk / device tokens expire (no immortal capability secrets).
-- Safe to re-run.

ALTER TABLE school_access_tokens
  ADD COLUMN IF NOT EXISTS kiosk_token_expires_at TIMESTAMPTZ;

ALTER TABLE school_access_tokens
  ADD COLUMN IF NOT EXISTS device_token_expires_at TIMESTAMPTZ;

-- Existing rows: 90-day horizon from apply time (rotate earlier anytime in Principal → Badges)
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


-- ========== 019_family_billing_portal.sql ==========
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

ALTER TABLE billing_payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Leadership manage payment plans" ON billing_payment_plans;
CREATE POLICY "Leadership manage payment plans" ON billing_payment_plans FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership())
  WITH CHECK (school_id = get_user_school_id() AND is_school_leadership());

DROP POLICY IF EXISTS "Leadership manage schedules" ON billing_schedules;
CREATE POLICY "Leadership manage schedules" ON billing_schedules FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership())
  WITH CHECK (school_id = get_user_school_id() AND is_school_leadership());

-- Parents can read open invoices for their email (portal uses service role; this is app RLS)
DROP POLICY IF EXISTS "Parents read own invoices" ON billing_invoices;
CREATE POLICY "Parents read own invoices" ON billing_invoices
  FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() = 'parent'
    AND parent_email IS NOT NULL
    AND lower(parent_email) = lower(COALESCE(
      (SELECT email FROM profiles WHERE id = auth.uid()),
      ''
    ))
  );


-- ========== 020_stripe_payments.sql ==========
-- Stripe Checkout linkage on billing_payments (idempotent webhook apply).
-- Safe to re-run.

ALTER TABLE billing_payments
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

ALTER TABLE billing_payments
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_payments_stripe_session
  ON billing_payments (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_billing_payments_stripe_pi
  ON billing_payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;


-- ========== 021_p0_money_settle.sql ==========
-- P0 money settle: at most one succeeded payment per invoice (blocks cash+Stripe double book).
-- Safe to re-run.

CREATE UNIQUE INDEX IF NOT EXISTS idx_billing_one_succeeded_payment_per_invoice
  ON billing_payments (invoice_id)
  WHERE status = 'succeeded' AND invoice_id IS NOT NULL;

-- Invoice amounts non-negative (align with products/schedules)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'billing_invoices_amount_cents_check'
  ) THEN
    ALTER TABLE billing_invoices
      ADD CONSTRAINT billing_invoices_amount_cents_check
      CHECK (amount_cents >= 0);
  END IF;
EXCEPTION
  WHEN others THEN
    -- Existing negative rows would block; skip constraint if conflict
    NULL;
END $$;


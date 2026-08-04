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

-- Principal billing + QuickBooks Online connection layer

CREATE TABLE IF NOT EXISTS quickbooks_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL UNIQUE REFERENCES schools(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'disconnected'
    CHECK (status IN ('disconnected', 'pending', 'connected', 'error')),
  environment TEXT NOT NULL DEFAULT 'sandbox'
    CHECK (environment IN ('sandbox', 'production')),
  realm_id TEXT,
  company_name TEXT,
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  scopes TEXT,
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  sync_customers BOOLEAN DEFAULT TRUE,
  sync_invoices BOOLEAN DEFAULT TRUE,
  sync_payments BOOLEAN DEFAULT TRUE,
  connected_by UUID REFERENCES profiles(id),
  connected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (frequency IN ('one_time', 'monthly', 'term', 'annual')),
  active BOOLEAN DEFAULT TRUE,
  qb_item_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id),
  family_name TEXT,
  parent_email TEXT,
  product_id UUID REFERENCES billing_products(id),
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'open', 'paid', 'void', 'overdue', 'syncing')),
  due_date DATE,
  qb_invoice_id TEXT,
  qb_synced_at TIMESTAMPTZ,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  method TEXT DEFAULT 'card'
    CHECK (method IN ('card', 'ach', 'check', 'cash', 'other', 'quickbooks')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded', 'syncing')),
  paid_at TIMESTAMPTZ,
  qb_payment_id TEXT,
  qb_synced_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_products_school ON billing_products(school_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_school ON billing_invoices(school_id);
CREATE INDEX IF NOT EXISTS idx_billing_payments_school ON billing_payments(school_id);

ALTER TABLE quickbooks_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_payments ENABLE ROW LEVEL SECURITY;

-- Leadership only (principal / admin / staff) via helper
CREATE OR REPLACE FUNCTION public.is_school_leadership()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_role() IN ('admin', 'staff', 'principal');
$$;

DROP POLICY IF EXISTS "Leadership manage QB connection" ON quickbooks_connections;
CREATE POLICY "Leadership manage QB connection" ON quickbooks_connections FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());

DROP POLICY IF EXISTS "Leadership manage products" ON billing_products;
CREATE POLICY "Leadership manage products" ON billing_products FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());

DROP POLICY IF EXISTS "Leadership manage invoices" ON billing_invoices;
CREATE POLICY "Leadership manage invoices" ON billing_invoices FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());

DROP POLICY IF EXISTS "Leadership manage payments" ON billing_payments;
CREATE POLICY "Leadership manage payments" ON billing_payments FOR ALL
  USING (school_id = get_user_school_id() AND is_school_leadership());

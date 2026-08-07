-- LBC Snack Shack: prepaid student wallet (parents load funds; staff debit purchases).
-- First-class tables — not schools.settings. Safe to re-run.

CREATE TABLE IF NOT EXISTS snack_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  balance_cents INTEGER NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  label TEXT NOT NULL DEFAULT 'LBC Snack Shack',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_snack_accounts_school
  ON snack_accounts (school_id);

CREATE INDEX IF NOT EXISTS idx_snack_accounts_student
  ON snack_accounts (student_id);

CREATE TABLE IF NOT EXISTS snack_ledger (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES snack_accounts(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL CHECK (entry_type IN ('credit', 'debit')),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  balance_after_cents INTEGER NOT NULL CHECK (balance_after_cents >= 0),
  note TEXT,
  actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES billing_invoices(id) ON DELETE SET NULL,
  payment_id UUID REFERENCES billing_payments(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (school_id, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_snack_ledger_account_created
  ON snack_ledger (account_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_snack_ledger_school_created
  ON snack_ledger (school_id, created_at DESC);

ALTER TABLE snack_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE snack_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff manage snack accounts" ON snack_accounts;
CREATE POLICY "Staff manage snack accounts" ON snack_accounts FOR ALL
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  )
  WITH CHECK (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );

DROP POLICY IF EXISTS "Parents read linked snack accounts" ON snack_accounts;
CREATE POLICY "Parents read linked snack accounts" ON snack_accounts FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.parent_id = auth.uid()
        AND ps.student_id = snack_accounts.student_id
    )
  );

DROP POLICY IF EXISTS "Staff manage snack ledger" ON snack_ledger;
CREATE POLICY "Staff manage snack ledger" ON snack_ledger FOR ALL
  USING (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  )
  WITH CHECK (
    school_id = get_user_school_id()
    AND get_user_role() IN ('admin', 'staff', 'principal', 'teacher')
  );

DROP POLICY IF EXISTS "Parents read linked snack ledger" ON snack_ledger;
CREATE POLICY "Parents read linked snack ledger" ON snack_ledger FOR SELECT
  USING (
    school_id = get_user_school_id()
    AND get_user_role() = 'parent'
    AND EXISTS (
      SELECT 1 FROM parent_students ps
      WHERE ps.parent_id = auth.uid()
        AND ps.student_id = snack_ledger.student_id
    )
  );

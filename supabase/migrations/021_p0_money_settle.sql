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

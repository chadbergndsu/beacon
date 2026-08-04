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

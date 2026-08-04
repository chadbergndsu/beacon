/**
 * Apply a paid Stripe Checkout session to Beacon billing (idempotent).
 */
import { createAdminClient } from '@/lib/supabase/admin'
import { addPayment, loadBillingState } from '@/lib/billing/store'
import type { StripeSessionPaid } from '@/lib/billing/stripe'
import { reportError } from '@/lib/ops/report-error'

export async function applyStripePaidSession(
  paid: StripeSessionPaid
): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
  const admin = createAdminClient()

  // Prefer durable unique column (migration 020)
  const { data: bySession } = await admin
    .from('billing_payments')
    .select('id')
    .eq('stripe_checkout_session_id', paid.sessionId)
    .maybeSingle()
  if (bySession?.id) return { ok: true, already: true }

  // Fallback if 020 not applied yet
  const { data: byNotes } = await admin
    .from('billing_payments')
    .select('id')
    .eq('school_id', paid.schoolId)
    .ilike('notes', `%${paid.sessionId}%`)
    .maybeSingle()
  if (byNotes?.id) return { ok: true, already: true }

  const state = await loadBillingState(paid.schoolId)
  const invoice = state.invoices.find((i) => i.id === paid.invoiceId)
  if (!invoice) {
    return { ok: false, error: 'Invoice not found for this school' }
  }
  if (invoice.status === 'paid') {
    // Still record stripe ids if possible for audit trail skip
    return { ok: true, already: true }
  }

  // Amount guard: allow ±1 cent float, reject large mismatches
  if (Math.abs(invoice.amountCents - paid.amountCents) > 1) {
    reportError(new Error('Stripe amount mismatch'), {
      surface: 'stripe-apply',
      invoiceAmount: invoice.amountCents,
      paidAmount: paid.amountCents,
      invoiceId: paid.invoiceId,
    })
    return {
      ok: false,
      error: `Amount mismatch: invoice ${invoice.amountCents} vs paid ${paid.amountCents}`,
    }
  }

  const paymentId = crypto.randomUUID()
  try {
    // Insert with stripe columns when available
    const row: Record<string, unknown> = {
      id: paymentId,
      school_id: paid.schoolId,
      invoice_id: paid.invoiceId,
      amount_cents: paid.amountCents,
      currency: paid.currency || invoice.currency || 'USD',
      method: 'card',
      status: 'succeeded',
      paid_at: new Date().toISOString(),
      notes: `Stripe Checkout ${paid.sessionId}`,
      created_at: new Date().toISOString(),
      stripe_checkout_session_id: paid.sessionId,
      stripe_payment_intent_id: paid.paymentIntentId,
    }
    const { error: insErr } = await admin.from('billing_payments').insert(row)
    if (insErr) {
      // Column missing — fall back to addPayment without stripe cols
      if (
        insErr.message?.includes('stripe_checkout') ||
        insErr.message?.includes('column') ||
        insErr.code === 'PGRST204'
      ) {
        await addPayment(paid.schoolId, {
          id: paymentId,
          invoiceId: paid.invoiceId,
          amountCents: paid.amountCents,
          currency: paid.currency || invoice.currency,
          method: 'card',
          status: 'succeeded',
          paidAt: new Date().toISOString(),
          notes: `Stripe Checkout ${paid.sessionId}`,
          createdAt: new Date().toISOString(),
        })
      } else if (
        insErr.code === '23505' ||
        (insErr.message || '').toLowerCase().includes('duplicate')
      ) {
        return { ok: true, already: true }
      } else {
        throw new Error(insErr.message)
      }
    } else {
      // CAS mark invoice paid
      await admin
        .from('billing_invoices')
        .update({ status: 'paid' })
        .eq('id', paid.invoiceId)
        .eq('school_id', paid.schoolId)
        .neq('status', 'paid')
    }
  } catch (e) {
    reportError(e, { surface: 'stripe-apply', sessionId: paid.sessionId })
    return { ok: false, error: e instanceof Error ? e.message : 'Could not record payment' }
  }

  await admin.from('audit_logs').insert({
    school_id: paid.schoolId,
    user_id: null,
    action: 'billing.stripe_paid',
    table_name: 'billing_invoices',
    record_id: paid.invoiceId,
    details: {
      sessionId: paid.sessionId,
      paymentIntentId: paid.paymentIntentId,
      amount: paid.amountCents,
    },
  })

  return { ok: true }
}

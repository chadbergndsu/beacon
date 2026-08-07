/**
 * Apply a paid Stripe Checkout session to Beacon billing (idempotent).
 * Loads invoice by id (never the 200-row list). Collectible statuses only.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import {
  addPayment,
  isCollectibleInvoiceStatus,
  loadInvoiceById,
} from '@/lib/billing/store'
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

  // P0: load by primary key — never loadBillingState 200-cap
  const invoice = await loadInvoiceById(paid.schoolId, paid.invoiceId)
  if (!invoice) {
    return { ok: false, error: 'Invoice not found for this school' }
  }

  // Amount guard
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

  if (!isCollectibleInvoiceStatus(invoice.status)) {
    // Already paid / void — do not second-book; audit for ops if card charged after office pay
    reportError(new Error('Stripe session for non-collectible invoice'), {
      surface: 'stripe-overpay',
      invoiceId: paid.invoiceId,
      status: invoice.status,
      sessionId: paid.sessionId,
      amount: paid.amountCents,
    })
    await admin.from('audit_logs').insert({
      school_id: paid.schoolId,
      user_id: null,
      action: 'billing.stripe_non_collectible',
      table_name: 'billing_invoices',
      record_id: paid.invoiceId,
      details: {
        sessionId: paid.sessionId,
        paymentIntentId: paid.paymentIntentId,
        amount: paid.amountCents,
        invoiceStatus: invoice.status,
        note: 'Card settled while invoice not open/overdue — manual refund/recon may be needed',
      },
    })
    return { ok: true, already: true }
  }

  const paymentId = crypto.randomUUID()
  const notes = `Stripe Checkout ${paid.sessionId}`

  try {
    // Prefer insert with stripe columns + shared settle path via addPayment claim
    // addPayment claims collectible + inserts; attach stripe ids after if columns exist
    await addPayment(paid.schoolId, {
      id: paymentId,
      invoiceId: paid.invoiceId,
      amountCents: paid.amountCents,
      currency: paid.currency || invoice.currency || 'USD',
      method: 'card',
      status: 'succeeded',
      paidAt: new Date().toISOString(),
      notes,
      createdAt: new Date().toISOString(),
    })

    // Best-effort attach Stripe ids (migration 020)
    await admin
      .from('billing_payments')
      .update({
        stripe_checkout_session_id: paid.sessionId,
        stripe_payment_intent_id: paid.paymentIntentId,
      })
      .eq('id', paymentId)
      .eq('school_id', paid.schoolId)

    // If addPayment lost the claim race (already paid), ensure we didn't leave a dangling need
    const after = await loadInvoiceById(paid.schoolId, paid.invoiceId)
    if (after && isCollectibleInvoiceStatus(after.status)) {
      // Payment insert may have failed unique one-succeeded-per-invoice
      const { data: anyPay } = await admin
        .from('billing_payments')
        .select('id')
        .eq('school_id', paid.schoolId)
        .eq('invoice_id', paid.invoiceId)
        .eq('status', 'succeeded')
        .limit(1)
        .maybeSingle()
      if (!anyPay?.id) {
        return { ok: false, error: 'Could not settle invoice after Stripe payment' }
      }
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

  // LBC Snack Shack: credit prepaid wallet when this was a parent top-up invoice
  if (invoice.sourceKey?.startsWith('snack_topup:')) {
    try {
      const { creditSnackFromPaidInvoice } = await import('@/lib/snack/store')
      const credit = await creditSnackFromPaidInvoice({
        schoolId: paid.schoolId,
        invoiceId: paid.invoiceId,
        paymentId,
      })
      if (!credit.ok) {
        reportError(new Error(credit.error), {
          surface: 'snack-topup-credit',
          invoiceId: paid.invoiceId,
        })
      }
    } catch (e) {
      reportError(e, { surface: 'snack-topup-credit', invoiceId: paid.invoiceId })
    }
  }

  return { ok: true }
}

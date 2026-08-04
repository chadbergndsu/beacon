import { NextResponse } from 'next/server'
import {
  getStripe,
  isStripeWebhookConfigured,
  type StripeSessionPaid,
} from '@/lib/billing/stripe'
import { applyStripePaidSession } from '@/lib/billing/stripe-apply'
import { reportError } from '@/lib/ops/report-error'

export const runtime = 'nodejs'

/**
 * Stripe webhook — https://<host>/api/stripe/webhook
 * Subscribe to: checkout.session.completed
 * Local: stripe listen --forward-to localhost:3000/api/stripe/webhook
 */
export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const secret = process.env.STRIPE_WEBHOOK_SECRET!.trim()

  try {
    const stripe = getStripe()
    const event = stripe.webhooks.constructEvent(body, sig, secret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      if (session.payment_status && session.payment_status !== 'paid') {
        return NextResponse.json({ received: true, skipped: true })
      }

      const schoolId = session.metadata?.school_id
      const invoiceId = session.metadata?.invoice_id || session.client_reference_id
      if (!schoolId || !invoiceId) {
        return NextResponse.json({ received: true, missing_meta: true })
      }

      const pi =
        typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id || null

      const paid: StripeSessionPaid = {
        sessionId: session.id,
        paymentIntentId: pi,
        schoolId,
        invoiceId,
        amountCents: session.amount_total ?? 0,
        currency: (session.currency || 'usd').toUpperCase(),
        paymentStatus: session.payment_status || 'paid',
      }

      const result = await applyStripePaidSession(paid)
      if (!result.ok) {
        reportError(new Error(result.error), { surface: 'stripe-webhook', sessionId: session.id })
        return NextResponse.json({ error: result.error }, { status: 422 })
      }
      return NextResponse.json({ received: true, already: result.already === true })
    }

    return NextResponse.json({ received: true })
  } catch (e) {
    reportError(e, { surface: 'stripe-webhook' })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Webhook failed' },
      { status: 400 }
    )
  }
}

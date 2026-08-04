import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { addPayment } from '@/lib/billing/store'
import { reportError } from '@/lib/ops/report-error'

/**
 * Stripe Checkout webhook — marks Beacon invoices paid after successful card pay.
 * Configure endpoint: https://<host>/api/stripe/webhook
 * Events: checkout.session.completed
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim()
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!secret || !key) {
    return NextResponse.json({ error: 'Stripe webhook not configured' }, { status: 503 })
  }

  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(key)
    const event = stripe.webhooks.constructEvent(body, sig, secret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string
        amount_total?: number | null
        metadata?: Record<string, string>
        payment_status?: string
      }
      if (session.payment_status && session.payment_status !== 'paid') {
        return NextResponse.json({ received: true, skipped: true })
      }
      const schoolId = session.metadata?.school_id
      const invoiceId = session.metadata?.invoice_id
      if (!schoolId || !invoiceId) {
        return NextResponse.json({ received: true, missing_meta: true })
      }

      const admin = createAdminClient()
      // Idempotent: skip if payment already recorded for this session
      const { data: existing } = await admin
        .from('billing_payments')
        .select('id')
        .eq('school_id', schoolId)
        .ilike('notes', `%${session.id}%`)
        .maybeSingle()
      if (existing?.id) {
        return NextResponse.json({ received: true, duplicate: true })
      }

      const amount = session.amount_total ?? 0
      await addPayment(schoolId, {
        id: crypto.randomUUID(),
        invoiceId,
        amountCents: amount,
        currency: 'USD',
        method: 'card',
        status: 'succeeded',
        paidAt: new Date().toISOString(),
        notes: `Stripe Checkout ${session.id}`,
        createdAt: new Date().toISOString(),
      })

      await admin.from('audit_logs').insert({
        school_id: schoolId,
        user_id: null,
        action: 'billing.stripe_paid',
        table_name: 'billing_invoices',
        record_id: invoiceId,
        details: { sessionId: session.id, amount },
      })
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

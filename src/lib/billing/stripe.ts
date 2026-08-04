/**
 * Stripe Checkout for Beacon family pay portal.
 *
 * Required:
 *   STRIPE_SECRET_KEY=sk_test_… or sk_live_…
 * Optional but recommended for production webhooks:
 *   STRIPE_WEBHOOK_SECRET=whsec_…
 * Optional (future Elements / branding):
 *   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_…
 */

import type Stripe from 'stripe'

let stripeSingleton: Stripe | null = null

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim()
  )
}

export function getStripePublishableKey(): string | null {
  const k = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
  return k || null
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set')
  }
  if (!stripeSingleton) {
    // Lazy require keeps unit tests light when key is unset
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const StripeSdk = require('stripe') as typeof import('stripe').default
    stripeSingleton = new StripeSdk(key, {
      typescript: true,
      appInfo: {
        name: 'Beacon School Suite',
        version: '0.1.0',
        url: 'https://beacon.commoncentsip.com',
      },
    })
  }
  return stripeSingleton
}

/** Reset singleton (tests). */
export function _resetStripeClientForTests(): void {
  stripeSingleton = null
}

export async function createInvoiceCheckoutSession(input: {
  schoolId: string
  invoiceId: string
  portalToken: string
  amountCents: number
  currency: string
  description: string
  parentEmail: string
  schoolName: string
  successUrl: string
  cancelUrl: string
}): Promise<{ url: string; sessionId: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: 'Online card pay is not configured (set STRIPE_SECRET_KEY).' }
  }
  if (!Number.isFinite(input.amountCents) || input.amountCents < 50) {
    return { error: 'Amount must be at least $0.50 for card payments.' }
  }

  try {
    const stripe = getStripe()
    const currency = (input.currency || 'usd').toLowerCase()
    // Idempotent per invoice attempt window — same invoice can reopen if unpaid
    const idempotencyKey = `beacon_inv_${input.invoiceId}_${input.amountCents}`.slice(0, 255)

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: input.parentEmail?.includes('@')
          ? input.parentEmail.trim()
          : undefined,
        client_reference_id: input.invoiceId,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency,
              unit_amount: Math.round(input.amountCents),
              product_data: {
                name: (input.description || 'School invoice').slice(0, 120),
                description: `${input.schoolName} · Beacon family portal`.slice(0, 500),
                metadata: {
                  school_id: input.schoolId,
                  invoice_id: input.invoiceId,
                },
              },
            },
          },
        ],
        success_url: input.successUrl.includes('?')
          ? `${input.successUrl}&session_id={CHECKOUT_SESSION_ID}`
          : `${input.successUrl}?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: input.cancelUrl,
        metadata: {
          school_id: input.schoolId,
          invoice_id: input.invoiceId,
          portal_token: input.portalToken,
          source: 'beacon_family_portal',
        },
        payment_intent_data: {
          metadata: {
            school_id: input.schoolId,
            invoice_id: input.invoiceId,
            source: 'beacon_family_portal',
          },
          description: `${input.schoolName}: ${input.description}`.slice(0, 500),
        },
      },
      { idempotencyKey }
    )

    if (!session.url) return { error: 'Stripe did not return a checkout URL.' }
    return { url: session.url, sessionId: session.id }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Stripe checkout failed' }
  }
}

export type StripeSessionPaid = {
  sessionId: string
  paymentIntentId: string | null
  schoolId: string
  invoiceId: string
  amountCents: number
  currency: string
  paymentStatus: string
}

/** Retrieve + validate a completed Checkout Session (webhook or success-page confirm). */
export async function retrievePaidCheckoutSession(
  sessionId: string
): Promise<StripeSessionPaid | { error: string }> {
  if (!isStripeConfigured()) return { error: 'Stripe not configured' }
  if (!sessionId?.startsWith('cs_')) return { error: 'Invalid session id' }

  try {
    const stripe = getStripe()
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    if (session.mode !== 'payment') {
      return { error: 'Unexpected checkout mode' }
    }
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return { error: `Payment not complete (${session.payment_status || session.status})` }
    }
    const schoolId = session.metadata?.school_id
    const invoiceId = session.metadata?.invoice_id || session.client_reference_id || ''
    if (!schoolId || !invoiceId) {
      return { error: 'Session missing school/invoice metadata' }
    }
    const amountCents = session.amount_total ?? 0
    if (amountCents < 50) return { error: 'Invalid paid amount' }

    const pi =
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null

    return {
      sessionId: session.id,
      paymentIntentId: pi,
      schoolId,
      invoiceId,
      amountCents,
      currency: (session.currency || 'usd').toUpperCase(),
      paymentStatus: session.payment_status || 'paid',
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Could not load Stripe session' }
  }
}

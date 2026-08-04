/**
 * Optional Stripe Checkout for family pay portal.
 * Without STRIPE_SECRET_KEY, portal shows "pay at school / office" only.
 */

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim())
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
}): Promise<{ url: string } | { error: string }> {
  if (!isStripeConfigured()) {
    return { error: 'Online card pay is not configured (set STRIPE_SECRET_KEY).' }
  }
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim())
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.parentEmail || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (input.currency || 'usd').toLowerCase(),
            unit_amount: input.amountCents,
            product_data: {
              name: input.description.slice(0, 120) || 'School invoice',
              description: `${input.schoolName} · Beacon family portal`,
            },
          },
        },
      ],
      success_url: input.successUrl,
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
        },
      },
    })
    if (!session.url) return { error: 'Stripe did not return a checkout URL.' }
    return { url: session.url }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Stripe checkout failed' }
  }
}

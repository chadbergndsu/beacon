import { afterEach, describe, expect, it } from 'vitest'
import {
  _resetStripeClientForTests,
  isStripeConfigured,
  isStripeWebhookConfigured,
} from './stripe'

describe('stripe config helpers', () => {
  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY
    delete process.env.STRIPE_WEBHOOK_SECRET
    _resetStripeClientForTests()
  })

  it('detects secret and webhook readiness', () => {
    expect(isStripeConfigured()).toBe(false)
    expect(isStripeWebhookConfigured()).toBe(false)
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    expect(isStripeConfigured()).toBe(true)
    expect(isStripeWebhookConfigured()).toBe(false)
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_x'
    expect(isStripeWebhookConfigured()).toBe(true)
  })

  it('createInvoiceCheckoutSession fails without key', async () => {
    const { createInvoiceCheckoutSession } = await import('./stripe')
    const r = await createInvoiceCheckoutSession({
      schoolId: 's',
      invoiceId: 'i',
      portalToken: 't',
      amountCents: 1000,
      currency: 'USD',
      description: 'Tuition',
      parentEmail: 'a@b.com',
      schoolName: 'School',
      successUrl: 'http://localhost/ok',
      cancelUrl: 'http://localhost/cancel',
    })
    expect('error' in r).toBe(true)
  })

  it('rejects tiny amounts', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_x'
    const { createInvoiceCheckoutSession } = await import('./stripe')
    const r = await createInvoiceCheckoutSession({
      schoolId: 's',
      invoiceId: 'i',
      portalToken: 't',
      amountCents: 10,
      currency: 'USD',
      description: 'x',
      parentEmail: 'a@b.com',
      schoolName: 'School',
      successUrl: 'http://localhost/ok',
      cancelUrl: 'http://localhost/cancel',
    })
    expect(r).toMatchObject({ error: expect.stringMatching(/0\.50/i) })
  })
})

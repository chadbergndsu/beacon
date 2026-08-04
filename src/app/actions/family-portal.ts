'use server'

import { loadInvoiceByPortalToken } from '@/lib/billing/store'
import {
  createInvoiceCheckoutSession,
  isStripeConfigured,
  retrievePaidCheckoutSession,
} from '@/lib/billing/stripe'
import { applyStripePaidSession } from '@/lib/billing/stripe-apply'
import { familyPayUrl } from '@/lib/billing/portal-token'
import { loadSchoolBrand } from '@/lib/school-brand'
import { rateLimitAsync } from '@/lib/security/rate-limit'

export async function getFamilyPortalInvoice(token: string) {
  const rl = await rateLimitAsync({
    key: `pay-portal:${token.slice(0, 12)}`,
    limit: 60,
    windowMs: 60_000,
  })
  if (!rl.ok) return { ok: false as const, error: 'Too many requests. Try again shortly.' }

  const found = await loadInvoiceByPortalToken(token)
  if (!found) return { ok: false as const, error: 'Invoice not found or link expired.' }

  const brand = await loadSchoolBrand(found.schoolId)
  return {
    ok: true as const,
    invoice: found.invoice,
    schoolName: brand.name,
    schoolEmail: brand.email,
    schoolPhone: brand.phone,
    stripeEnabled: isStripeConfigured(),
    canPayOnline:
      isStripeConfigured() &&
      (found.invoice.status === 'open' || found.invoice.status === 'overdue'),
  }
}

export async function startFamilyPortalCheckout(
  token: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const rl = await rateLimitAsync({
    key: `pay-checkout:${token.slice(0, 12)}`,
    limit: 20,
    windowMs: 60_000,
  })
  if (!rl.ok) return { ok: false, error: 'Too many requests.' }

  const found = await loadInvoiceByPortalToken(token)
  if (!found) return { ok: false, error: 'Invoice not found.' }
  const { invoice, schoolId } = found
  if (invoice.status === 'paid') return { ok: false, error: 'This invoice is already paid.' }
  if (invoice.status === 'void') return { ok: false, error: 'This invoice was voided.' }

  const brand = await loadSchoolBrand(schoolId)
  const base = familyPayUrl(token)
  const session = await createInvoiceCheckoutSession({
    schoolId,
    invoiceId: invoice.id,
    portalToken: token,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    description: invoice.description,
    parentEmail: invoice.parentEmail,
    schoolName: brand.name,
    successUrl: `${base}?paid=1`,
    cancelUrl: `${base}?cancelled=1`,
  })
  if ('error' in session) return { ok: false, error: session.error }
  return { ok: true, url: session.url }
}

/**
 * Success-page reconcile: if webhook is slow, apply payment from Checkout session id.
 * Safe to call multiple times (idempotent).
 */
export async function confirmFamilyPortalStripeSession(input: {
  token: string
  sessionId: string
}): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
  const rl = await rateLimitAsync({
    key: `pay-confirm:${input.token.slice(0, 12)}`,
    limit: 30,
    windowMs: 60_000,
  })
  if (!rl.ok) return { ok: false, error: 'Too many requests.' }

  const found = await loadInvoiceByPortalToken(input.token)
  if (!found) return { ok: false, error: 'Invoice not found.' }

  const paid = await retrievePaidCheckoutSession(input.sessionId)
  if ('error' in paid) return { ok: false, error: paid.error }

  if (paid.invoiceId !== found.invoice.id || paid.schoolId !== found.schoolId) {
    return { ok: false, error: 'Session does not match this invoice.' }
  }

  return applyStripePaidSession(paid)
}

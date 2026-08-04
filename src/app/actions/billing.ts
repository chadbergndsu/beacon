'use server'

import { revalidatePath } from 'next/cache'
import { requirePrincipal } from '@/lib/principal'
import {
  addInvoice,
  addPayment,
  loadBillingState,
  updateQuickBooks,
  upsertProduct,
} from '@/lib/billing/store'
import { buildQuickBooksAuthorizeUrl, getQuickBooksConfig } from '@/lib/billing/quickbooks'
import type {
  BillingFrequency,
  BillingInvoice,
  BillingPayment,
  BillingProduct,
} from '@/lib/billing/types'
import { createAdminClient } from '@/lib/supabase/admin'

function revalidatePrincipal() {
  revalidatePath('/principal')
  revalidatePath('/principal/payments')
  revalidatePath('/principal/billing')
  revalidatePath('/principal/invoices')
}

export async function getBillingBundle() {
  const { schoolId, profile } = await requirePrincipal()
  const state = await loadBillingState(schoolId)
  const qb = getQuickBooksConfig()
  // Never return clientSecret (server-action serialization risk)
  const qbConfig = {
    configured: qb.configured,
    environment: qb.environment,
    redirectUri: qb.redirectUri,
  }
  return { state, qbConfig, schoolId, profile }
}

export async function startQuickBooksConnect(): Promise<
  { ok: true; url: string } | { ok: false; error: string; demo?: boolean }
> {
  const { schoolId, user, profile } = await requirePrincipal()
  const cfg = getQuickBooksConfig()

  // Always mark pending when user starts connect
  await updateQuickBooks(schoolId, {
    status: 'pending',
    environment: cfg.environment,
    lastError: null,
  })

  const { signOAuthState } = await import('@/lib/security/oauth-state')
  const state = signOAuthState({ schoolId, userId: user.id })

  const url = buildQuickBooksAuthorizeUrl(state)
  if (!url) {
    // Demo mode — never claim live "connected" without vaulted tokens
    await updateQuickBooks(schoolId, {
      status: 'demo',
      environment: 'sandbox',
      realmId: 'demo-realm-sandbox',
      companyName: 'Sandbox Demo Company (not live QuickBooks)',
      connectedAt: new Date().toISOString(),
      lastSyncAt: null,
      lastError: null,
      connectedByName: profile.full_name,
      syncCustomers: true,
      syncInvoices: true,
      syncPayments: true,
    })

    const admin = createAdminClient()
    await admin.from('audit_logs').insert({
      school_id: schoolId,
      user_id: user.id,
      action: 'quickbooks.demo_connected',
      table_name: 'quickbooks_connections',
      details: {
        mode: 'demo',
        note: 'INTUIT_CLIENT_ID not set — demo connection (no live OAuth tokens)',
      },
    })

    revalidatePrincipal()
    return {
      ok: false,
      demo: true,
      error:
        'QuickBooks credentials not configured. Demo mode activated (not live). Add INTUIT_CLIENT_ID + INTUIT_CLIENT_SECRET for real OAuth.',
    }
  }

  revalidatePrincipal()
  return { ok: true, url }
}

export async function disconnectQuickBooks(): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId, user } = await requirePrincipal()
  await updateQuickBooks(schoolId, {
    status: 'disconnected',
    realmId: null,
    companyName: null,
    connectedAt: null,
    lastSyncAt: null,
    lastError: null,
  })

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: user.id,
    action: 'quickbooks.disconnected',
    table_name: 'quickbooks_connections',
  })

  revalidatePrincipal()
  return { ok: true }
}

export async function saveSyncPreferences(input: {
  syncCustomers: boolean
  syncInvoices: boolean
  syncPayments: boolean
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId } = await requirePrincipal()
  await updateQuickBooks(schoolId, {
    syncCustomers: input.syncCustomers,
    syncInvoices: input.syncInvoices,
    syncPayments: input.syncPayments,
  })
  revalidatePrincipal()
  return { ok: true }
}

/** @deprecated use syncQuickBooksNow — kept as alias for older UI bundles */
export async function simulateQuickBooksSync(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  return syncQuickBooksNow()
}

/** Push local invoices/payments to QuickBooks Online (live API when connected). */
export async function syncQuickBooksNow(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  const { schoolId, user } = await requirePrincipal()
  const { syncSchoolToQuickBooks } = await import('@/lib/billing/qbo-sync')
  const result = await syncSchoolToQuickBooks(schoolId)

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: user.id,
    action: result.ok ? 'quickbooks.sync' : 'quickbooks.sync_partial',
    table_name: 'quickbooks_connections',
    details: {
      invoicesPushed: result.invoicesPushed,
      paymentsPushed: result.paymentsPushed,
      skipped: result.skipped,
      errors: result.errors.slice(0, 10),
    },
  })

  revalidatePrincipal()
  if (!result.ok && result.invoicesPushed === 0 && result.paymentsPushed === 0) {
    return { ok: false, error: result.message }
  }
  return { ok: true, message: result.message }
}

export async function createBillingProduct(input: {
  name: string
  description: string
  amountDollars: number
  frequency: BillingFrequency
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId } = await requirePrincipal()
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Name is required.' }
  const amountCents = Math.round(Number(input.amountDollars) * 100)
  if (!Number.isFinite(amountCents) || amountCents < 0) {
    return { ok: false, error: 'Enter a valid amount.' }
  }

  const product: BillingProduct = {
    id: crypto.randomUUID(),
    name,
    description: input.description.trim(),
    amountCents,
    currency: 'USD',
    frequency: input.frequency,
    active: true,
  }
  await upsertProduct(schoolId, product)
  revalidatePrincipal()
  return { ok: true }
}

export async function createTuitionInvoice(input: {
  familyName: string
  parentEmail: string
  productId: string
  dueDate: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId, user } = await requirePrincipal()
  const state = await loadBillingState(schoolId)
  const product = state.products.find((p) => p.id === input.productId)
  if (!product) return { ok: false, error: 'Select a product.' }
  if (!input.familyName.trim()) return { ok: false, error: 'Family name required.' }

  const invoice: BillingInvoice = {
    id: crypto.randomUUID(),
    familyName: input.familyName.trim(),
    parentEmail: input.parentEmail.trim(),
    productId: product.id,
    description: product.name,
    amountCents: product.amountCents,
    currency: product.currency,
    status: 'open',
    dueDate: input.dueDate || null,
    createdAt: new Date().toISOString(),
  }
  await addInvoice(schoolId, invoice)

  let qbNote: string | undefined
  if (state.quickbooks.status === 'connected' && state.quickbooks.syncInvoices) {
    const { pushInvoiceToQbo } = await import('@/lib/billing/qbo-sync')
    const push = await pushInvoiceToQbo(schoolId, invoice)
    if (!push.ok) qbNote = `Local invoice saved; QuickBooks push failed: ${push.error}`
    else qbNote = `QuickBooks invoice #${push.qbInvoiceId}`
  }

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: user.id,
    action: 'billing.invoice_created',
    table_name: 'billing_invoices',
    record_id: null,
    details: { ...invoice, qbNote },
  })

  revalidatePrincipal()
  void qbNote
  return { ok: true }
}

export async function recordPayment(input: {
  invoiceId: string
  method: BillingPayment['method']
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId, user } = await requirePrincipal()
  const state = await loadBillingState(schoolId)
  const { loadInvoiceById, isCollectibleInvoiceStatus } = await import('@/lib/billing/store')
  const invoice =
    (await loadInvoiceById(schoolId, input.invoiceId)) ||
    state.invoices.find((i) => i.id === input.invoiceId)
  if (!invoice) return { ok: false, error: 'Invoice not found.' }
  if (!isCollectibleInvoiceStatus(invoice.status)) {
    return {
      ok: false,
      error:
        invoice.status === 'paid'
          ? 'Invoice is already paid.'
          : `Invoice cannot be collected (status: ${invoice.status}).`,
    }
  }

  const payment: BillingPayment = {
    id: crypto.randomUUID(),
    invoiceId: invoice.id,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    method: input.method,
    status: 'succeeded',
    paidAt: new Date().toISOString(),
    notes:
      state.quickbooks.status === 'connected' && state.quickbooks.syncPayments
        ? 'Pending QuickBooks payment sync'
        : null,
    createdAt: new Date().toISOString(),
    qbPaymentId: null,
  }
  // addPayment CAS-marks invoice paid; concurrent double-pay is dropped
  const after = await addPayment(schoolId, payment)
  const stillOpen = after.invoices.find((i) => i.id === invoice.id && i.status !== 'paid')
  const paymentLanded = after.payments.some((p) => p.id === payment.id)
  if (!paymentLanded && stillOpen) {
    return { ok: false, error: 'Could not record payment — try again.' }
  }
  if (!paymentLanded && !stillOpen) {
    return { ok: false, error: 'Invoice is already paid.' }
  }

  if (state.quickbooks.status === 'connected' && state.quickbooks.syncPayments) {
    const { pushPaymentToQbo } = await import('@/lib/billing/qbo-sync')
    const inv = after.invoices.find((i) => i.id === invoice.id) || invoice
    await pushPaymentToQbo(schoolId, payment, inv)
  }

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: user.id,
    action: 'billing.payment_recorded',
    table_name: 'billing_payments',
    details: payment,
  })

  revalidatePrincipal()
  return { ok: true }
}

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
  const qbConfig = getQuickBooksConfig()
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

  const state = Buffer.from(
    JSON.stringify({ schoolId, userId: user.id, ts: Date.now() })
  ).toString('base64url')

  const url = buildQuickBooksAuthorizeUrl(state)
  if (!url) {
    // Demo mode: simulate connected sandbox company so principal can tour the UI
    await updateQuickBooks(schoolId, {
      status: 'connected',
      environment: 'sandbox',
      realmId: 'demo-realm-lighthouse',
      companyName: 'Lighthouse Christian Academy (Sandbox)',
      connectedAt: new Date().toISOString(),
      lastSyncAt: new Date().toISOString(),
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
        note: 'INTUIT_CLIENT_ID not set — sandbox demo connection activated',
      },
    })

    revalidatePrincipal()
    return {
      ok: false,
      demo: true,
      error:
        'QuickBooks app credentials are not configured yet. Activated a sandbox demo connection so you can explore the full payment layer. Add INTUIT_CLIENT_ID + INTUIT_CLIENT_SECRET to enable live OAuth.',
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

export async function simulateQuickBooksSync(): Promise<
  { ok: true; message: string } | { ok: false; error: string }
> {
  const { schoolId, user } = await requirePrincipal()
  const state = await loadBillingState(schoolId)
  if (state.quickbooks.status !== 'connected') {
    return { ok: false, error: 'Connect QuickBooks before syncing.' }
  }

  await updateQuickBooks(schoolId, {
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  })

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: user.id,
    action: 'quickbooks.sync',
    table_name: 'quickbooks_connections',
    details: {
      products: state.products.length,
      invoices: state.invoices.length,
      payments: state.payments.length,
    },
  })

  revalidatePrincipal()
  return {
    ok: true,
    message: `Synced ${state.products.length} items, ${state.invoices.length} invoices, ${state.payments.length} payments to QuickBooks${state.quickbooks.companyName ? ` (${state.quickbooks.companyName})` : ''}.`,
  }
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
    id: `prod_${Date.now().toString(36)}`,
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
    id: `inv_${Date.now().toString(36)}`,
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

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: user.id,
    action: 'billing.invoice_created',
    table_name: 'billing_invoices',
    record_id: null,
    details: invoice,
  })

  revalidatePrincipal()
  return { ok: true }
}

export async function recordPayment(input: {
  invoiceId: string
  method: BillingPayment['method']
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId, user } = await requirePrincipal()
  const state = await loadBillingState(schoolId)
  const invoice = state.invoices.find((i) => i.id === input.invoiceId)
  if (!invoice) return { ok: false, error: 'Invoice not found.' }

  const payment: BillingPayment = {
    id: `pay_${Date.now().toString(36)}`,
    invoiceId: invoice.id,
    amountCents: invoice.amountCents,
    currency: invoice.currency,
    method: input.method,
    status: 'succeeded',
    paidAt: new Date().toISOString(),
    notes: state.quickbooks.status === 'connected' ? 'Queued for QuickBooks payment sync' : null,
    createdAt: new Date().toISOString(),
    qbPaymentId:
      state.quickbooks.status === 'connected' ? `qb-demo-${Date.now().toString(36)}` : null,
  }
  await addPayment(schoolId, payment)

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

/**
 * Push local Beacon invoices/payments to QuickBooks Online when connected.
 * Local rows always remain source of truth; QBO ids stored on success.
 */

import {
  createQboInvoice,
  createQboPayment,
  findOrCreateCustomer,
  refreshQuickBooksTokens,
  type QboEnv,
} from '@/lib/billing/qbo-api'
import {
  loadBillingState,
  loadQbVault,
  markInvoiceQbSynced,
  markPaymentQbSynced,
  updateQuickBooks,
} from '@/lib/billing/store'
import type { BillingInvoice, BillingPayment } from '@/lib/billing/types'
import { reportError } from '@/lib/ops/report-error'

export type QboSyncResult = {
  ok: boolean
  invoicesPushed: number
  paymentsPushed: number
  skipped: number
  errors: string[]
  message: string
}

const SKEW_MS = 5 * 60_000

async function getLiveQboClient(schoolId: string): Promise<
  | {
      accessToken: string
      realmId: string
      environment: QboEnv
      syncInvoices: boolean
      syncPayments: boolean
      syncCustomers: boolean
    }
  | { error: string }
> {
  const vault = await loadQbVault(schoolId)
  if (!vault) return { error: 'No QuickBooks connection row.' }
  if (vault.status === 'demo') {
    return { error: 'Demo QuickBooks cannot push. Connect with live INTUIT credentials.' }
  }
  if (vault.status !== 'connected') {
    return { error: 'Connect QuickBooks before syncing.' }
  }
  if (!vault.realmId) return { error: 'Missing QuickBooks realm id — reconnect.' }
  if (!vault.accessToken && !vault.refreshToken) {
    return { error: 'No vaulted OAuth tokens — reconnect QuickBooks.' }
  }

  let accessToken = vault.accessToken || ''
  let refreshToken = vault.refreshToken || ''
  const exp = vault.tokenExpiresAt ? Date.parse(vault.tokenExpiresAt) : 0
  const needsRefresh = !accessToken || !exp || exp - SKEW_MS <= Date.now()

  if (needsRefresh) {
    if (!refreshToken) return { error: 'Access token expired and no refresh token — reconnect.' }
    try {
      const next = await refreshQuickBooksTokens(refreshToken)
      accessToken = next.accessToken
      refreshToken = next.refreshToken
      await updateQuickBooks(schoolId, {
        accessToken: next.accessToken,
        refreshToken: next.refreshToken,
        tokenExpiresAt: new Date(Date.now() + next.expiresIn * 1000).toISOString(),
        lastError: null,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Token refresh failed'
      await updateQuickBooks(schoolId, { lastError: msg, status: 'error' })
      reportError(e, { surface: 'qbo-refresh', schoolId })
      return { error: msg }
    }
  }

  return {
    accessToken,
    realmId: vault.realmId,
    environment: vault.environment,
    syncInvoices: vault.syncInvoices,
    syncPayments: vault.syncPayments,
    syncCustomers: vault.syncCustomers,
  }
}

/** Cache customer id by family email/name within a single sync run. */
async function customerIdForInvoice(
  client: {
    accessToken: string
    realmId: string
    environment: QboEnv
  },
  inv: BillingInvoice,
  cache: Map<string, string>
): Promise<string> {
  const key = `${inv.parentEmail || ''}|${inv.familyName}`.toLowerCase()
  const hit = cache.get(key)
  if (hit) return hit
  const { id } = await findOrCreateCustomer(client, {
    displayName: inv.familyName || inv.parentEmail || 'Beacon family',
    email: inv.parentEmail,
  })
  cache.set(key, id)
  return id
}

export async function pushInvoiceToQbo(
  schoolId: string,
  invoice: BillingInvoice
): Promise<{ ok: true; qbInvoiceId: string } | { ok: false; error: string }> {
  if (invoice.qbInvoiceId) return { ok: true, qbInvoiceId: invoice.qbInvoiceId }
  const client = await getLiveQboClient(schoolId)
  if ('error' in client) return { ok: false, error: client.error }
  if (!client.syncInvoices) return { ok: false, error: 'Invoice sync is turned off in preferences.' }

  try {
    const customerId = await customerIdForInvoice(client, invoice, new Map())
    const { id } = await createQboInvoice(client, {
      customerId,
      description: invoice.description,
      amountCents: invoice.amountCents,
      dueDate: invoice.dueDate,
    })
    await markInvoiceQbSynced(schoolId, invoice.id, id)
    return { ok: true, qbInvoiceId: id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Invoice push failed'
    reportError(e, { surface: 'qbo-invoice', schoolId, invoiceId: invoice.id })
    await updateQuickBooks(schoolId, { lastError: msg })
    return { ok: false, error: msg }
  }
}

export async function pushPaymentToQbo(
  schoolId: string,
  payment: BillingPayment,
  invoice: BillingInvoice | undefined
): Promise<{ ok: true; qbPaymentId: string } | { ok: false; error: string }> {
  if (payment.qbPaymentId && !payment.qbPaymentId.startsWith('qb-demo-')) {
    return { ok: true, qbPaymentId: payment.qbPaymentId }
  }
  if (!invoice) return { ok: false, error: 'Payment has no matching local invoice.' }
  if (!invoice.qbInvoiceId) {
    const invPush = await pushInvoiceToQbo(schoolId, invoice)
    if (!invPush.ok) return invPush
    invoice = { ...invoice, qbInvoiceId: invPush.qbInvoiceId }
  }

  const client = await getLiveQboClient(schoolId)
  if ('error' in client) return { ok: false, error: client.error }
  if (!client.syncPayments) return { ok: false, error: 'Payment sync is turned off in preferences.' }

  try {
    const customerId = await customerIdForInvoice(client, invoice, new Map())
    const { id } = await createQboPayment(client, {
      customerId,
      amountCents: payment.amountCents,
      qbInvoiceId: invoice.qbInvoiceId!,
    })
    await markPaymentQbSynced(schoolId, payment.id, id)
    return { ok: true, qbPaymentId: id }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Payment push failed'
    reportError(e, { surface: 'qbo-payment', schoolId, paymentId: payment.id })
    await updateQuickBooks(schoolId, { lastError: msg })
    return { ok: false, error: msg }
  }
}

/** Principal “Sync now” — push unsynced open/paid money to QBO. */
export async function syncSchoolToQuickBooks(schoolId: string): Promise<QboSyncResult> {
  const client = await getLiveQboClient(schoolId)
  if ('error' in client) {
    return {
      ok: false,
      invoicesPushed: 0,
      paymentsPushed: 0,
      skipped: 0,
      errors: [client.error],
      message: client.error,
    }
  }

  const state = await loadBillingState(schoolId)
  const cache = new Map<string, string>()
  const errors: string[] = []
  let invoicesPushed = 0
  let paymentsPushed = 0
  let skipped = 0

  // Build invoice map with live qb ids as we go
  const invById = new Map(state.invoices.map((i) => [i.id, { ...i }]))

  if (client.syncInvoices) {
    for (const inv of state.invoices) {
      if (inv.qbInvoiceId) {
        skipped++
        continue
      }
      if (inv.status === 'void' || inv.status === 'draft') {
        skipped++
        continue
      }
      try {
        const customerId = await customerIdForInvoice(client, inv, cache)
        const { id } = await createQboInvoice(client, {
          customerId,
          description: inv.description,
          amountCents: inv.amountCents,
          dueDate: inv.dueDate,
        })
        await markInvoiceQbSynced(schoolId, inv.id, id)
        invById.set(inv.id, { ...inv, qbInvoiceId: id })
        invoicesPushed++
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'invoice failed'
        errors.push(`${inv.familyName}: ${msg}`)
        reportError(e, { surface: 'qbo-sync-invoice', schoolId, invoiceId: inv.id })
      }
    }
  }

  if (client.syncPayments) {
    for (const pay of state.payments) {
      if (pay.status !== 'succeeded') {
        skipped++
        continue
      }
      if (pay.qbPaymentId && !pay.qbPaymentId.startsWith('qb-demo-')) {
        skipped++
        continue
      }
      const inv = pay.invoiceId ? invById.get(pay.invoiceId) : undefined
      if (!inv?.qbInvoiceId) {
        if (inv && client.syncInvoices) {
          // already tried above
          errors.push(`Payment ${pay.id.slice(0, 8)}: invoice not on QuickBooks yet`)
        } else {
          skipped++
        }
        continue
      }
      try {
        const customerId = await customerIdForInvoice(client, inv, cache)
        const { id } = await createQboPayment(client, {
          customerId,
          amountCents: pay.amountCents,
          qbInvoiceId: inv.qbInvoiceId,
        })
        await markPaymentQbSynced(schoolId, pay.id, id)
        paymentsPushed++
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'payment failed'
        errors.push(`Payment: ${msg}`)
        reportError(e, { surface: 'qbo-sync-payment', schoolId, paymentId: pay.id })
      }
    }
  }

  const ok = errors.length === 0
  await updateQuickBooks(schoolId, {
    lastSyncAt: new Date().toISOString(),
    lastError: ok ? null : errors[0] || 'Some items failed to sync',
    status: 'connected',
  })

  const message = ok
    ? `Pushed ${invoicesPushed} invoice(s) and ${paymentsPushed} payment(s) to QuickBooks` +
      (skipped ? ` (${skipped} already synced or skipped)` : '') +
      '.'
    : `Partial sync: ${invoicesPushed} invoices, ${paymentsPushed} payments. ${errors.length} error(s): ${errors.slice(0, 3).join('; ')}`

  return {
    ok,
    invoicesPushed,
    paymentsPushed,
    skipped,
    errors,
    message,
  }
}

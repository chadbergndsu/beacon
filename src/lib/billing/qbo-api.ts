/**
 * QuickBooks Online REST helpers (Accounting API v3).
 * Pure-ish: token refresh + invoice/payment create with injectable fetch for tests.
 */

import { getQuickBooksConfig } from '@/lib/billing/quickbooks'

export type QboEnv = 'sandbox' | 'production'

export function qboApiBase(environment: QboEnv): string {
  return environment === 'production'
    ? 'https://quickbooks.api.intuit.com'
    : 'https://sandbox-quickbooks.api.intuit.com'
}

export type QboTokens = {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export async function refreshQuickBooksTokens(
  refreshToken: string,
  fetchImpl: typeof fetch = fetch
): Promise<QboTokens> {
  const cfg = getQuickBooksConfig()
  if (!cfg.configured) {
    throw new Error('QuickBooks is not configured (missing INTUIT_CLIENT_ID/SECRET).')
  }
  const basic = Buffer.from(`${cfg.clientId}:${cfg.clientSecret}`).toString('base64')
  const res = await fetchImpl('https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  })
  const data = (await res.json()) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  }
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'Token refresh failed')
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in || 3600,
  }
}

export type QboClientOpts = {
  accessToken: string
  realmId: string
  environment: QboEnv
  fetchImpl?: typeof fetch
}

async function qboRequest<T>(
  opts: QboClientOpts,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const fetchImpl = opts.fetchImpl || fetch
  const base = qboApiBase(opts.environment)
  const url = `${base}/v3/company/${opts.realmId}${path}${path.includes('?') ? '&' : '?'}minorversion=65`
  const res = await fetchImpl(url, {
    method,
    headers: {
      Authorization: `Bearer ${opts.accessToken}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = (await res.json().catch(() => ({}))) as T & {
    Fault?: { Error?: { Message?: string; Detail?: string }[] }
  }
  if (!res.ok) {
    const err = data?.Fault?.Error?.[0]
    const msg = err?.Detail || err?.Message || `QuickBooks HTTP ${res.status}`
    throw new Error(msg)
  }
  return data
}

/** Find customer by DisplayName (exact) or create. */
export async function findOrCreateCustomer(
  opts: QboClientOpts,
  input: { displayName: string; email?: string | null }
): Promise<{ id: string; created: boolean }> {
  const name = input.displayName.trim() || 'Beacon customer'
  const safe = name.replace(/'/g, "\\'")
  const query = encodeURIComponent(`select * from Customer where DisplayName = '${safe}'`)
  const found = await qboRequest<{ QueryResponse?: { Customer?: { Id: string }[] } }>(
    opts,
    'GET',
    `/query?query=${query}`
  )
  const existing = found.QueryResponse?.Customer?.[0]
  if (existing?.Id) return { id: String(existing.Id), created: false }

  const created = await qboRequest<{ Customer?: { Id?: string } }>(opts, 'POST', '/customer', {
    DisplayName: name.slice(0, 100),
    PrimaryEmailAddr: input.email?.includes('@')
      ? { Address: input.email.trim().slice(0, 100) }
      : undefined,
  })
  const id = created.Customer?.Id
  if (!id) throw new Error('QuickBooks customer create returned no Id')
  return { id: String(id), created: true }
}

export function buildSalesInvoiceBody(input: {
  customerId: string
  description: string
  amountDollars: number
  dueDate?: string | null
  /** Default Services item in most QBO companies / sandboxes */
  itemRef?: { value: string; name?: string }
}) {
  const amount = Math.round(input.amountDollars * 100) / 100
  const item = input.itemRef || { value: '1', name: 'Services' }
  return {
    CustomerRef: { value: input.customerId },
    DueDate: input.dueDate || undefined,
    Line: [
      {
        Amount: amount,
        DetailType: 'SalesItemLineDetail',
        Description: input.description.slice(0, 4000),
        SalesItemLineDetail: {
          ItemRef: item,
          Qty: 1,
          UnitPrice: amount,
        },
      },
    ],
  }
}

export async function createQboInvoice(
  opts: QboClientOpts,
  input: {
    customerId: string
    description: string
    amountCents: number
    dueDate?: string | null
    itemRef?: { value: string; name?: string }
  }
): Promise<{ id: string }> {
  const body = buildSalesInvoiceBody({
    customerId: input.customerId,
    description: input.description,
    amountDollars: input.amountCents / 100,
    dueDate: input.dueDate,
    itemRef: input.itemRef,
  })
  const data = await qboRequest<{ Invoice?: { Id?: string } }>(opts, 'POST', '/invoice', body)
  const id = data.Invoice?.Id
  if (!id) throw new Error('QuickBooks invoice create returned no Id')
  return { id: String(id) }
}

export function buildPaymentBody(input: {
  customerId: string
  amountDollars: number
  qbInvoiceId: string
}) {
  const amount = Math.round(input.amountDollars * 100) / 100
  return {
    CustomerRef: { value: input.customerId },
    TotalAmt: amount,
    Line: [
      {
        Amount: amount,
        LinkedTxn: [{ TxnId: input.qbInvoiceId, TxnType: 'Invoice' }],
      },
    ],
  }
}

export async function createQboPayment(
  opts: QboClientOpts,
  input: {
    customerId: string
    amountCents: number
    qbInvoiceId: string
  }
): Promise<{ id: string }> {
  const body = buildPaymentBody({
    customerId: input.customerId,
    amountDollars: input.amountCents / 100,
    qbInvoiceId: input.qbInvoiceId,
  })
  const data = await qboRequest<{ Payment?: { Id?: string } }>(opts, 'POST', '/payment', body)
  const id = data.Payment?.Id
  if (!id) throw new Error('QuickBooks payment create returned no Id')
  return { id: String(id) }
}

/** Company info (validates token + realm). */
export async function fetchQboCompanyName(opts: QboClientOpts): Promise<string | null> {
  try {
    const data = await qboRequest<{
      CompanyInfo?: { CompanyName?: string } | { CompanyName?: string }[]
      QueryResponse?: { CompanyInfo?: { CompanyName?: string }[] }
    }>(opts, 'GET', `/companyinfo/${opts.realmId}`)
    const info = data.CompanyInfo
    if (Array.isArray(info)) return info[0]?.CompanyName || null
    return info?.CompanyName || null
  } catch {
    return null
  }
}

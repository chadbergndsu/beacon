import { createAdminClient } from '@/lib/supabase/admin'
import {
  defaultBillingState,
  type BillingFrequency,
  type BillingInvoice,
  type BillingPayment,
  type BillingProduct,
  type InvoiceStatus,
  type PaymentMethod,
  type PaymentStatus,
  type QbConnectionStatus,
  type QbEnvironment,
  type QuickBooksConnection,
  type SchoolBillingState,
} from '@/lib/billing/types'

const FREQ: BillingFrequency[] = ['one_time', 'monthly', 'term', 'annual']
const INV_STATUS: InvoiceStatus[] = ['draft', 'open', 'paid', 'void', 'overdue', 'syncing']
const PAY_STATUS: PaymentStatus[] = ['pending', 'succeeded', 'failed', 'refunded', 'syncing']
const PAY_METHOD: PaymentMethod[] = ['card', 'ach', 'check', 'cash', 'other', 'quickbooks']
const QB_STATUS: QbConnectionStatus[] = [
  'disconnected',
  'pending',
  'connected',
  'demo',
  'error',
]

function isMissingRelation(err: { message?: string; code?: string } | null | undefined): boolean {
  if (!err) return false
  const m = (err.message || '').toLowerCase()
  return (
    err.code === '42P01' ||
    m.includes('does not exist') ||
    m.includes('could not find the table') ||
    m.includes('schema cache')
  )
}

function mapProduct(row: Record<string, unknown>): BillingProduct {
  const freq = String(row.frequency || 'monthly')
  return {
    id: String(row.id),
    name: String(row.name || ''),
    description: String(row.description || ''),
    amountCents: Number(row.amount_cents) || 0,
    currency: String(row.currency || 'USD'),
    frequency: (FREQ.includes(freq as BillingFrequency) ? freq : 'monthly') as BillingFrequency,
    active: row.active !== false,
    code: row.code != null ? String(row.code) : null,
    qbItemId: row.qb_item_id != null ? String(row.qb_item_id) : null,
  }
}

function mapInvoice(row: Record<string, unknown>): BillingInvoice {
  const status = String(row.status || 'open')
  return {
    id: String(row.id),
    studentId: row.student_id != null ? String(row.student_id) : null,
    familyName: String(row.family_name || ''),
    parentEmail: String(row.parent_email || ''),
    productId: row.product_id != null ? String(row.product_id) : null,
    description: String(row.description || ''),
    amountCents: Number(row.amount_cents) || 0,
    currency: String(row.currency || 'USD'),
    status: (INV_STATUS.includes(status as InvoiceStatus) ? status : 'open') as InvoiceStatus,
    dueDate: row.due_date != null ? String(row.due_date).slice(0, 10) : null,
    qbInvoiceId: row.qb_invoice_id != null ? String(row.qb_invoice_id) : null,
    sourceKey: row.source_key != null ? String(row.source_key) : null,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
  }
}

function mapPayment(row: Record<string, unknown>): BillingPayment {
  const status = String(row.status || 'pending')
  const method = String(row.method || 'other')
  return {
    id: String(row.id),
    invoiceId: row.invoice_id != null ? String(row.invoice_id) : null,
    amountCents: Number(row.amount_cents) || 0,
    currency: String(row.currency || 'USD'),
    method: (PAY_METHOD.includes(method as PaymentMethod) ? method : 'other') as PaymentMethod,
    status: (PAY_STATUS.includes(status as PaymentStatus) ? status : 'pending') as PaymentStatus,
    paidAt: row.paid_at != null ? String(row.paid_at) : null,
    qbPaymentId: row.qb_payment_id != null ? String(row.qb_payment_id) : null,
    notes: row.notes != null ? String(row.notes) : null,
    createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
  }
}

function mapQb(row: Record<string, unknown> | null | undefined): QuickBooksConnection {
  const base = defaultBillingState().quickbooks
  if (!row) return base
  const status = String(row.status || 'disconnected')
  const env = String(row.environment || 'sandbox')
  return {
    status: (QB_STATUS.includes(status as QbConnectionStatus)
      ? status
      : 'disconnected') as QbConnectionStatus,
    environment: (env === 'production' ? 'production' : 'sandbox') as QbEnvironment,
    realmId: row.realm_id != null ? String(row.realm_id) : null,
    companyName: row.company_name != null ? String(row.company_name) : null,
    connectedAt: row.connected_at != null ? String(row.connected_at) : null,
    lastSyncAt: row.last_sync_at != null ? String(row.last_sync_at) : null,
    lastError: row.last_error != null ? String(row.last_error) : null,
    syncCustomers: row.sync_customers !== false,
    syncInvoices: row.sync_invoices !== false,
    syncPayments: row.sync_payments !== false,
    connectedByName: null,
  }
}

function seedProductRows(schoolId: string): Array<Record<string, unknown>> {
  return [
    {
      id: crypto.randomUUID(),
      school_id: schoolId,
      code: 'tuition_k5',
      name: 'K–5 Tuition',
      description: 'Monthly elementary tuition',
      amount_cents: 45000,
      currency: 'USD',
      frequency: 'monthly',
      active: true,
    },
    {
      id: crypto.randomUUID(),
      school_id: schoolId,
      code: 'tuition_ms',
      name: 'Middle School Tuition',
      description: 'Monthly middle school tuition',
      amount_cents: 47500,
      currency: 'USD',
      frequency: 'monthly',
      active: true,
    },
    {
      id: crypto.randomUUID(),
      school_id: schoolId,
      code: 'registration',
      name: 'Annual Registration',
      description: 'One-time registration fee',
      amount_cents: 15000,
      currency: 'USD',
      frequency: 'annual',
      active: true,
    },
  ]
}

/** Load billing from first-class tables (006/017). No schools.settings money RMW. */
export async function loadBillingState(schoolId: string): Promise<SchoolBillingState> {
  const admin = createAdminClient()

  const [qbRes, prodRes, invRes, payRes] = await Promise.all([
    admin.from('quickbooks_connections').select('*').eq('school_id', schoolId).maybeSingle(),
    admin
      .from('billing_products')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true }),
    admin
      .from('billing_invoices')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(200),
    admin
      .from('billing_payments')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (
    isMissingRelation(qbRes.error) ||
    isMissingRelation(prodRes.error) ||
    isMissingRelation(invRes.error) ||
    isMissingRelation(payRes.error)
  ) {
    throw new Error(
      'Billing tables missing — apply supabase/migrations/006_billing_quickbooks.sql and 017_billing_first_class.sql'
    )
  }

  let products = ((prodRes.data || []) as Record<string, unknown>[]).map(mapProduct)

  // Seed catalog once per school when empty (idempotent via unique code index)
  if (products.length === 0) {
    const seeds = seedProductRows(schoolId)
    const { error: seedErr } = await admin.from('billing_products').insert(seeds)
    if (!seedErr) {
      products = seeds.map(mapProduct)
    } else if (!isMissingRelation(seedErr)) {
      // concurrent seed or unique race — re-read
      const { data: again } = await admin
        .from('billing_products')
        .select('*')
        .eq('school_id', schoolId)
      products = ((again || []) as Record<string, unknown>[]).map(mapProduct)
    }
  }

  return {
    quickbooks: mapQb(qbRes.data as Record<string, unknown> | null),
    products,
    invoices: ((invRes.data || []) as Record<string, unknown>[]).map(mapInvoice),
    payments: ((payRes.data || []) as Record<string, unknown>[]).map(mapPayment),
  }
}

/**
 * @deprecated Money state is table-backed. Throws if called — use row mutators instead.
 */
export async function saveBillingState(
  schoolId: string,
  billing: SchoolBillingState
): Promise<void> {
  void schoolId
  void billing
  throw new Error(
    'saveBillingState is removed — use updateQuickBooks / upsertProduct / addInvoice / addPayment'
  )
}

export async function updateQuickBooks(
  schoolId: string,
  patch: Partial<QuickBooksConnection> & {
    accessToken?: string | null
    refreshToken?: string | null
    tokenExpiresAt?: string | null
    connectedBy?: string | null
  }
): Promise<SchoolBillingState> {
  const admin = createAdminClient()
  const current = await loadBillingState(schoolId)
  const next: QuickBooksConnection = { ...current.quickbooks, ...patch }

  const row: Record<string, unknown> = {
    school_id: schoolId,
    status: next.status,
    environment: next.environment,
    realm_id: next.realmId,
    company_name: next.companyName,
    last_sync_at: next.lastSyncAt,
    last_error: next.lastError,
    sync_customers: next.syncCustomers,
    sync_invoices: next.syncInvoices,
    sync_payments: next.syncPayments,
    connected_at: next.connectedAt,
    updated_at: new Date().toISOString(),
  }
  if (patch.connectedBy !== undefined) row.connected_by = patch.connectedBy
  if (patch.accessToken !== undefined) row.access_token_encrypted = patch.accessToken
  if (patch.refreshToken !== undefined) row.refresh_token_encrypted = patch.refreshToken
  if (patch.tokenExpiresAt !== undefined) row.token_expires_at = patch.tokenExpiresAt

  // Disconnect clears vaulted tokens
  if (next.status === 'disconnected') {
    row.access_token_encrypted = null
    row.refresh_token_encrypted = null
    row.token_expires_at = null
  }

  const { error } = await admin.from('quickbooks_connections').upsert(row, {
    onConflict: 'school_id',
  })
  if (error) throw new Error(error.message)

  return loadBillingState(schoolId)
}

export async function upsertProduct(
  schoolId: string,
  product: BillingProduct
): Promise<SchoolBillingState> {
  const admin = createAdminClient()
  const id =
    product.id && /^[0-9a-f-]{36}$/i.test(product.id) ? product.id : crypto.randomUUID()

  const row = {
    id,
    school_id: schoolId,
    name: product.name,
    description: product.description || '',
    amount_cents: Math.max(0, Math.round(product.amountCents)),
    currency: product.currency || 'USD',
    frequency: product.frequency,
    active: product.active !== false,
    code: product.code || null,
    qb_item_id: product.qbItemId || null,
  }

  // Prefer upsert by id; if code set and row missing, conflict on code is ok via select-first
  if (product.code) {
    const { data: existing } = await admin
      .from('billing_products')
      .select('id')
      .eq('school_id', schoolId)
      .eq('code', product.code)
      .maybeSingle()
    if (existing?.id) {
      row.id = String(existing.id)
    }
  }

  const { error } = await admin.from('billing_products').upsert(row, { onConflict: 'id' })
  if (error) throw new Error(error.message)
  return loadBillingState(schoolId)
}

/** Ensure aftercare product exists; returns product with UUID id. */
export async function ensureProductByCode(
  schoolId: string,
  code: string,
  defaults: Omit<BillingProduct, 'id' | 'code'>
): Promise<BillingProduct> {
  const state = await loadBillingState(schoolId)
  const found = state.products.find((p) => p.code === code)
  if (found) return found

  const product: BillingProduct = {
    id: crypto.randomUUID(),
    code,
    ...defaults,
  }
  await upsertProduct(schoolId, product)
  const again = await loadBillingState(schoolId)
  const created = again.products.find((p) => p.code === code)
  if (!created) throw new Error(`Failed to create product ${code}`)
  return created
}

export async function addInvoice(
  schoolId: string,
  invoice: BillingInvoice
): Promise<SchoolBillingState> {
  const admin = createAdminClient()

  // Idempotent by source_key (aftercare) or by id
  if (invoice.sourceKey) {
    const { data: existing } = await admin
      .from('billing_invoices')
      .select('id')
      .eq('school_id', schoolId)
      .eq('source_key', invoice.sourceKey)
      .maybeSingle()
    if (existing?.id) {
      return loadBillingState(schoolId)
    }
  }

  const id =
    invoice.id && /^[0-9a-f-]{36}$/i.test(invoice.id) ? invoice.id : crypto.randomUUID()

  if (invoice.id && /^[0-9a-f-]{36}$/i.test(invoice.id)) {
    const { data: byId } = await admin
      .from('billing_invoices')
      .select('id')
      .eq('school_id', schoolId)
      .eq('id', invoice.id)
      .maybeSingle()
    if (byId?.id) return loadBillingState(schoolId)
  }

  const productId =
    invoice.productId && /^[0-9a-f-]{36}$/i.test(invoice.productId) ? invoice.productId : null
  const studentId =
    invoice.studentId && /^[0-9a-f-]{36}$/i.test(invoice.studentId) ? invoice.studentId : null

  const row = {
    id,
    school_id: schoolId,
    student_id: studentId,
    family_name: invoice.familyName,
    parent_email: invoice.parentEmail,
    product_id: productId,
    description: invoice.description,
    amount_cents: Math.max(0, Math.round(invoice.amountCents)),
    currency: invoice.currency || 'USD',
    status: invoice.status || 'open',
    due_date: invoice.dueDate || null,
    qb_invoice_id: invoice.qbInvoiceId || null,
    source_key: invoice.sourceKey || null,
    created_at: invoice.createdAt || new Date().toISOString(),
  }

  const { error } = await admin.from('billing_invoices').insert(row)
  if (error) {
    // Unique race on source_key — treat as idempotent success
    if (
      error.code === '23505' ||
      (error.message || '').toLowerCase().includes('duplicate') ||
      (error.message || '').toLowerCase().includes('unique')
    ) {
      return loadBillingState(schoolId)
    }
    throw new Error(error.message)
  }

  return loadBillingState(schoolId)
}

/**
 * Record payment and CAS-mark invoice paid.
 * Concurrent double-pay: second caller loses the status CAS and returns without duplicate charge.
 */
export async function addPayment(
  schoolId: string,
  payment: BillingPayment
): Promise<SchoolBillingState> {
  const admin = createAdminClient()
  const id =
    payment.id && /^[0-9a-f-]{36}$/i.test(payment.id) ? payment.id : crypto.randomUUID()

  const { data: byId } = await admin
    .from('billing_payments')
    .select('id')
    .eq('school_id', schoolId)
    .eq('id', id)
    .maybeSingle()
  if (byId?.id) return loadBillingState(schoolId)

  if (payment.invoiceId && payment.status === 'succeeded') {
    const { data: claimed, error: claimErr } = await admin
      .from('billing_invoices')
      .update({ status: 'paid' })
      .eq('id', payment.invoiceId)
      .eq('school_id', schoolId)
      .neq('status', 'paid')
      .select('id')
      .maybeSingle()

    if (claimErr) throw new Error(claimErr.message)
    if (!claimed) {
      // Already paid — do not insert a second successful payment
      return loadBillingState(schoolId)
    }
  }

  const invoiceId =
    payment.invoiceId && /^[0-9a-f-]{36}$/i.test(payment.invoiceId) ? payment.invoiceId : null

  const row = {
    id,
    school_id: schoolId,
    invoice_id: invoiceId,
    amount_cents: Math.max(0, Math.round(payment.amountCents)),
    currency: payment.currency || 'USD',
    method: payment.method || 'other',
    status: payment.status || 'pending',
    paid_at: payment.paidAt || null,
    qb_payment_id: payment.qbPaymentId || null,
    notes: payment.notes || null,
    created_at: payment.createdAt || new Date().toISOString(),
  }

  const { error } = await admin.from('billing_payments').insert(row)
  if (error) {
    if (
      error.code === '23505' ||
      (error.message || '').toLowerCase().includes('duplicate') ||
      (error.message || '').toLowerCase().includes('unique')
    ) {
      return loadBillingState(schoolId)
    }
    throw new Error(error.message)
  }

  return loadBillingState(schoolId)
}

export function formatMoney(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

/** Deterministic aftercare source key for session → invoice idempotency */
export function aftercareInvoiceSourceKey(sessionId: string): string {
  return `aftercare_session:${sessionId}`
}

/** Server-only OAuth vault (never returned via loadBillingState / client actions). */
export async function loadQbVault(schoolId: string): Promise<{
  status: string
  environment: 'sandbox' | 'production'
  realmId: string | null
  accessToken: string | null
  refreshToken: string | null
  tokenExpiresAt: string | null
  syncCustomers: boolean
  syncInvoices: boolean
  syncPayments: boolean
} | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('quickbooks_connections')
    .select(
      'status, environment, realm_id, access_token_encrypted, refresh_token_encrypted, token_expires_at, sync_customers, sync_invoices, sync_payments'
    )
    .eq('school_id', schoolId)
    .maybeSingle()
  if (error || !data) return null
  return {
    status: String(data.status || 'disconnected'),
    environment: data.environment === 'production' ? 'production' : 'sandbox',
    realmId: data.realm_id != null ? String(data.realm_id) : null,
    accessToken: data.access_token_encrypted != null ? String(data.access_token_encrypted) : null,
    refreshToken:
      data.refresh_token_encrypted != null ? String(data.refresh_token_encrypted) : null,
    tokenExpiresAt: data.token_expires_at != null ? String(data.token_expires_at) : null,
    syncCustomers: data.sync_customers !== false,
    syncInvoices: data.sync_invoices !== false,
    syncPayments: data.sync_payments !== false,
  }
}

export async function markInvoiceQbSynced(
  schoolId: string,
  invoiceId: string,
  qbInvoiceId: string
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('billing_invoices')
    .update({
      qb_invoice_id: qbInvoiceId,
      qb_synced_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('school_id', schoolId)
  if (error) throw new Error(error.message)
}

export async function markPaymentQbSynced(
  schoolId: string,
  paymentId: string,
  qbPaymentId: string
): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('billing_payments')
    .update({
      qb_payment_id: qbPaymentId,
      qb_synced_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .eq('school_id', schoolId)
  if (error) throw new Error(error.message)
}

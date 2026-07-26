import { createAdminClient } from '@/lib/supabase/admin'
import {
  defaultBillingState,
  type BillingInvoice,
  type BillingPayment,
  type BillingProduct,
  type QuickBooksConnection,
  type SchoolBillingState,
} from '@/lib/billing/types'

type SchoolSettings = {
  billing?: SchoolBillingState
  [key: string]: unknown
}

export async function loadBillingState(schoolId: string): Promise<SchoolBillingState> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()

  const settings = (data?.settings || {}) as SchoolSettings
  const base = defaultBillingState()
  if (!settings.billing) return seedDemoBilling(base)
  return {
    quickbooks: { ...base.quickbooks, ...settings.billing.quickbooks },
    products: settings.billing.products?.length
      ? settings.billing.products
      : seedDemoBilling(base).products,
    invoices: settings.billing.invoices ?? [],
    payments: settings.billing.payments ?? [],
  }
}

function seedDemoBilling(base: SchoolBillingState): SchoolBillingState {
  const products: BillingProduct[] = [
    {
      id: 'prod_tuition_k5',
      name: 'K–5 Tuition',
      description: 'Monthly elementary tuition',
      amountCents: 45000,
      currency: 'USD',
      frequency: 'monthly',
      active: true,
    },
    {
      id: 'prod_tuition_ms',
      name: 'Middle School Tuition',
      description: 'Monthly middle school tuition',
      amountCents: 47500,
      currency: 'USD',
      frequency: 'monthly',
      active: true,
    },
    {
      id: 'prod_registration',
      name: 'Annual Registration',
      description: 'One-time registration fee',
      amountCents: 15000,
      currency: 'USD',
      frequency: 'annual',
      active: true,
    },
  ]
  return { ...base, products }
}

export async function saveBillingState(
  schoolId: string,
  billing: SchoolBillingState
): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()

  const settings = { ...((data?.settings || {}) as SchoolSettings), billing }
  const { error } = await admin
    .from('schools')
    .update({ settings })
    .eq('id', schoolId)

  if (error) throw new Error(error.message)
}

export async function updateQuickBooks(
  schoolId: string,
  patch: Partial<QuickBooksConnection>
): Promise<SchoolBillingState> {
  const state = await loadBillingState(schoolId)
  state.quickbooks = { ...state.quickbooks, ...patch }
  await saveBillingState(schoolId, state)
  return state
}

export async function upsertProduct(
  schoolId: string,
  product: BillingProduct
): Promise<SchoolBillingState> {
  const state = await loadBillingState(schoolId)
  const idx = state.products.findIndex((p) => p.id === product.id)
  if (idx >= 0) state.products[idx] = product
  else state.products.push(product)
  await saveBillingState(schoolId, state)
  return state
}

export async function addInvoice(
  schoolId: string,
  invoice: BillingInvoice
): Promise<SchoolBillingState> {
  const state = await loadBillingState(schoolId)
  state.invoices = [invoice, ...state.invoices]
  await saveBillingState(schoolId, state)
  return state
}

export async function addPayment(
  schoolId: string,
  payment: BillingPayment
): Promise<SchoolBillingState> {
  const state = await loadBillingState(schoolId)
  state.payments = [payment, ...state.payments]
  // mark linked invoice paid
  if (payment.invoiceId && payment.status === 'succeeded') {
    state.invoices = state.invoices.map((inv) =>
      inv.id === payment.invoiceId ? { ...inv, status: 'paid' } : inv
    )
  }
  await saveBillingState(schoolId, state)
  return state
}

export function formatMoney(cents: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

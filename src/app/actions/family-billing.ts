'use server'

import { revalidatePath } from 'next/cache'
import { requirePrincipal } from '@/lib/principal'
import {
  createBillingSchedule,
  createPaymentPlan,
  loadBillingState,
  runDueBillingSchedules,
} from '@/lib/billing/store'
import { sendInvoiceEmailForSchool } from '@/lib/billing/invoice-email'
import { createAdminClient } from '@/lib/supabase/admin'

function revalidateBilling() {
  revalidatePath('/principal/invoices')
  revalidatePath('/principal/billing')
  revalidatePath('/principal/payments')
  revalidatePath('/dashboard')
}

export async function emailInvoiceToFamily(
  invoiceId: string
): Promise<{ ok: true; payUrl: string } | { ok: false; error: string }> {
  const { schoolId, user } = await requirePrincipal()
  const result = await sendInvoiceEmailForSchool(schoolId, invoiceId, {
    actorUserId: user.id,
    reason: 'principal_manual',
  })
  revalidateBilling()
  if (!result.ok) return result
  return { ok: true, payUrl: result.payUrl }
}

export async function remindOpenInvoices(): Promise<
  { ok: true; sent: number; errors: string[] } | { ok: false; error: string }
> {
  const { schoolId } = await requirePrincipal()
  const state = await loadBillingState(schoolId)
  const open = state.invoices.filter(
    (i) => (i.status === 'open' || i.status === 'overdue') && i.parentEmail?.includes('@')
  )
  let sent = 0
  const errors: string[] = []
  for (const inv of open.slice(0, 40)) {
    const r = await emailInvoiceToFamily(inv.id)
    if (r.ok) sent++
    else errors.push(`${inv.familyName}: ${r.error}`)
  }
  revalidateBilling()
  return { ok: true, sent, errors }
}

export async function createFamilyPaymentPlan(input: {
  familyName: string
  parentEmail: string
  description: string
  totalDollars: number
  installmentCount: number
  firstDueDate: string
}): Promise<{ ok: true; planId: string } | { ok: false; error: string }> {
  const { schoolId, user } = await requirePrincipal()
  const name = input.familyName.trim()
  const email = input.parentEmail.trim()
  if (!name) return { ok: false, error: 'Family name required.' }
  if (!email.includes('@')) return { ok: false, error: 'Valid parent email required.' }
  const totalCents = Math.round(Number(input.totalDollars) * 100)
  if (!Number.isFinite(totalCents) || totalCents < 100) {
    return { ok: false, error: 'Enter a total of at least $1.' }
  }
  const n = Math.floor(Number(input.installmentCount))
  if (n < 2 || n > 24) return { ok: false, error: 'Installments must be 2–24.' }
  if (!input.firstDueDate) return { ok: false, error: 'First due date required.' }

  try {
    const { planId } = await createPaymentPlan({
      schoolId,
      familyName: name,
      parentEmail: email,
      description: input.description.trim() || 'Payment plan',
      totalCents,
      installmentCount: n,
      firstDueDate: input.firstDueDate,
      createdBy: user.id,
    })
    revalidateBilling()
    return { ok: true, planId }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Plan failed' }
  }
}

export async function createRecurringSchedule(input: {
  familyName: string
  parentEmail: string
  productId: string
  nextRunOn: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { schoolId, user } = await requirePrincipal()
  const state = await loadBillingState(schoolId)
  const product = state.products.find((p) => p.id === input.productId)
  if (!product) return { ok: false, error: 'Select a product.' }
  if (!input.familyName.trim()) return { ok: false, error: 'Family name required.' }
  if (!input.parentEmail.includes('@')) return { ok: false, error: 'Valid email required.' }
  if (!input.nextRunOn) return { ok: false, error: 'Next bill date required.' }

  const frequency: 'monthly' | 'term' | 'annual' =
    product.frequency === 'annual' || product.frequency === 'term'
      ? product.frequency
      : 'monthly'

  try {
    await createBillingSchedule({
      schoolId,
      productId: product.id,
      familyName: input.familyName.trim(),
      parentEmail: input.parentEmail.trim(),
      description: product.name,
      amountCents: product.amountCents,
      frequency,
      nextRunOn: input.nextRunOn,
      createdBy: user.id,
    })
    revalidateBilling()
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Schedule failed' }
  }
}

export async function runRecurringBillingNow(): Promise<
  { ok: true; created: number; errors: string[] } | { ok: false; error: string }
> {
  const { schoolId, user } = await requirePrincipal()
  const result = await runDueBillingSchedules(schoolId)
  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: user.id,
    action: 'billing.schedules_run',
    table_name: 'billing_schedules',
    details: result,
  })
  revalidateBilling()
  return { ok: true, created: result.created, errors: result.errors }
}

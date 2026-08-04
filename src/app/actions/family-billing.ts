'use server'

import { revalidatePath } from 'next/cache'
import { requirePrincipal } from '@/lib/principal'
import {
  createBillingSchedule,
  createPaymentPlan,
  ensureInvoicePortalToken,
  loadBillingState,
  markInvoiceReminded,
  runDueBillingSchedules,
} from '@/lib/billing/store'
import { familyPayUrl } from '@/lib/billing/portal-token'
import { formatMoney } from '@/lib/billing/store'
import { queueAndSendEmail } from '@/lib/email/send'
import { loadSchoolBrand } from '@/lib/school-brand'
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
  const state = await loadBillingState(schoolId)
  const inv = state.invoices.find((i) => i.id === invoiceId)
  if (!inv) return { ok: false, error: 'Invoice not found.' }
  if (!inv.parentEmail?.includes('@')) {
    return { ok: false, error: 'Invoice has no parent email.' }
  }
  if (inv.status === 'paid' || inv.status === 'void') {
    return { ok: false, error: 'Invoice is not open for collection.' }
  }

  const token = await ensureInvoicePortalToken(schoolId, inv.id)
  const payUrl = familyPayUrl(token)
  const brand = await loadSchoolBrand(schoolId)

  const result = await queueAndSendEmail(
    {
      school_id: schoolId,
      kind: 'invoice',
      to_email: inv.parentEmail.trim(),
      to_name: inv.familyName,
      subject: `${brand.shortName || brand.name}: Invoice · ${inv.description}`,
      body_text: [
        `Hello ${inv.familyName},`,
        '',
        `${brand.name} has an invoice ready for you:`,
        `${inv.description}`,
        `Amount: ${formatMoney(inv.amountCents, inv.currency)}`,
        inv.dueDate ? `Due: ${inv.dueDate}` : '',
        '',
        `View and pay: ${payUrl}`,
        '',
        '— Beacon family billing (school-owned portal, not a third-party biller)',
      ]
        .filter(Boolean)
        .join('\n'),
      body_html: `<p>Hello ${escapeHtml(inv.familyName)},</p>
<p><strong>${escapeHtml(brand.name)}</strong> has an invoice ready:</p>
<p>${escapeHtml(inv.description)}<br/>
<strong>${escapeHtml(formatMoney(inv.amountCents, inv.currency))}</strong>
${inv.dueDate ? `<br/>Due ${escapeHtml(inv.dueDate)}` : ''}</p>
<p><a href="${payUrl}">View &amp; pay online</a></p>
<p style="color:#64748b;font-size:12px">Beacon family portal — owned by your school.</p>`,
      related_table: 'billing_invoices',
      related_id: inv.id,
      meta: { portal: true },
    },
    { brand }
  )

  await markInvoiceReminded(schoolId, inv.id)

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: user.id,
    action: 'billing.invoice_emailed',
    table_name: 'billing_invoices',
    record_id: inv.id,
    details: { status: result.status, payUrl },
  })

  revalidateBilling()
  if (result.status === 'failed') {
    return { ok: false, error: result.error || 'Email failed.' }
  }
  return { ok: true, payUrl }
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

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

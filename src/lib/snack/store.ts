/**
 * LBC Snack Shack — prepaid student wallets.
 * Parents load funds via billing invoices + Stripe; staff debit purchases.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import {
  addInvoice,
  ensureProductByCode,
  loadInvoiceById,
} from '@/lib/billing/store'
import { newPortalToken } from '@/lib/billing/portal-token'
import {
  LBC_LABEL,
  LBC_PRODUCT_CODE,
  nextBalanceCents,
  parseSnackTopUpSourceKey,
  snackTopUpIdempotencyKey,
  snackTopUpSourceKey,
  type SnackEntryType,
} from '@/lib/snack/ledger'
import type { BillingInvoice } from '@/lib/billing/types'

export type SnackAccount = {
  id: string
  schoolId: string
  studentId: string
  studentName: string
  balanceCents: number
  currency: string
  label: string
}

export type SnackLedgerEntry = {
  id: string
  entryType: SnackEntryType
  amountCents: number
  balanceAfterCents: number
  note: string | null
  createdAt: string
}

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

export async function ensureSnackAccount(
  schoolId: string,
  studentId: string
): Promise<SnackAccount | null> {
  const admin = createAdminClient()
  const { data: student } = await admin
    .from('students')
    .select('id, first_name, last_name, school_id')
    .eq('id', studentId)
    .eq('school_id', schoolId)
    .maybeSingle()
  if (!student) return null

  const { data: existing } = await admin
    .from('snack_accounts')
    .select('*')
    .eq('school_id', schoolId)
    .eq('student_id', studentId)
    .maybeSingle()

  if (existing) {
    return {
      id: String(existing.id),
      schoolId,
      studentId,
      studentName: `${student.first_name} ${student.last_name}`.trim(),
      balanceCents: Number(existing.balance_cents) || 0,
      currency: String(existing.currency || 'USD'),
      label: String(existing.label || LBC_LABEL),
    }
  }

  const { data: created, error } = await admin
    .from('snack_accounts')
    .insert({
      school_id: schoolId,
      student_id: studentId,
      balance_cents: 0,
      currency: 'USD',
      label: LBC_LABEL,
    })
    .select('*')
    .maybeSingle()

  if (error) {
    if (isMissingRelation(error)) return null
    // Race: unique — re-read
    const { data: again } = await admin
      .from('snack_accounts')
      .select('*')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .maybeSingle()
    if (!again) throw new Error(error.message)
    return {
      id: String(again.id),
      schoolId,
      studentId,
      studentName: `${student.first_name} ${student.last_name}`.trim(),
      balanceCents: Number(again.balance_cents) || 0,
      currency: String(again.currency || 'USD'),
      label: String(again.label || LBC_LABEL),
    }
  }

  if (!created) return null
  return {
    id: String(created.id),
    schoolId,
    studentId,
    studentName: `${student.first_name} ${student.last_name}`.trim(),
    balanceCents: Number(created.balance_cents) || 0,
    currency: String(created.currency || 'USD'),
    label: String(created.label || LBC_LABEL),
  }
}

export async function listSnackAccountsForParent(
  schoolId: string,
  parentId: string
): Promise<SnackAccount[]> {
  const admin = createAdminClient()
  const { data: links } = await admin
    .from('parent_students')
    .select('student_id')
    .eq('parent_id', parentId)
  const studentIds = [...new Set((links ?? []).map((l) => String(l.student_id)))]
  if (!studentIds.length) return []

  const out: SnackAccount[] = []
  for (const studentId of studentIds) {
    const acct = await ensureSnackAccount(schoolId, studentId)
    if (acct) out.push(acct)
  }
  return out.sort((a, b) => a.studentName.localeCompare(b.studentName))
}

export async function listSnackAccountsForSchool(schoolId: string): Promise<SnackAccount[]> {
  const admin = createAdminClient()
  const { data: rows, error } = await admin
    .from('snack_accounts')
    .select('id, school_id, student_id, balance_cents, currency, label')
    .eq('school_id', schoolId)
    .order('updated_at', { ascending: false })
    .limit(200)

  if (error) {
    if (isMissingRelation(error)) return []
    throw new Error(error.message)
  }

  const studentIds = [...new Set((rows ?? []).map((r) => String(r.student_id)))]
  const { data: students } = studentIds.length
    ? await admin
        .from('students')
        .select('id, first_name, last_name')
        .eq('school_id', schoolId)
        .in('id', studentIds)
    : { data: [] as { id: string; first_name: string; last_name: string }[] }

  const nameById = new Map(
    (students ?? []).map((s) => [String(s.id), `${s.first_name} ${s.last_name}`.trim()])
  )

  return (rows ?? []).map((r) => ({
    id: String(r.id),
    schoolId,
    studentId: String(r.student_id),
    studentName: nameById.get(String(r.student_id)) || 'Student',
    balanceCents: Number(r.balance_cents) || 0,
    currency: String(r.currency || 'USD'),
    label: String(r.label || LBC_LABEL),
  }))
}

export async function listRecentLedger(
  schoolId: string,
  accountId: string,
  limit = 20
): Promise<SnackLedgerEntry[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('snack_ledger')
    .select('id, entry_type, amount_cents, balance_after_cents, note, created_at')
    .eq('school_id', schoolId)
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    if (isMissingRelation(error)) return []
    throw new Error(error.message)
  }

  return (data ?? []).map((r) => ({
    id: String(r.id),
    entryType: r.entry_type === 'debit' ? 'debit' : 'credit',
    amountCents: Number(r.amount_cents) || 0,
    balanceAfterCents: Number(r.balance_after_cents) || 0,
    note: r.note != null ? String(r.note) : null,
    createdAt: String(r.created_at),
  }))
}

async function applyLedgerEntry(opts: {
  schoolId: string
  studentId: string
  entryType: SnackEntryType
  amountCents: number
  note?: string
  actorUserId?: string | null
  invoiceId?: string | null
  paymentId?: string | null
  idempotencyKey: string
}): Promise<{ ok: true; account: SnackAccount; already?: boolean } | { ok: false; error: string }> {
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from('snack_ledger')
    .select('id, account_id')
    .eq('school_id', opts.schoolId)
    .eq('idempotency_key', opts.idempotencyKey)
    .maybeSingle()

  if (existing?.id) {
    const acct = await ensureSnackAccount(opts.schoolId, opts.studentId)
    if (!acct) return { ok: false, error: 'Snack account not found.' }
    return { ok: true, account: acct, already: true }
  }

  const acct = await ensureSnackAccount(opts.schoolId, opts.studentId)
  if (!acct) return { ok: false, error: 'Student not found for LBC Snack Shack.' }

  const next = nextBalanceCents({
    currentCents: acct.balanceCents,
    entryType: opts.entryType,
    amountCents: opts.amountCents,
  })
  if (!next.ok) return next

  const { error: ledErr } = await admin.from('snack_ledger').insert({
    school_id: opts.schoolId,
    account_id: acct.id,
    student_id: opts.studentId,
    entry_type: opts.entryType,
    amount_cents: Math.round(opts.amountCents),
    balance_after_cents: next.balanceAfter,
    note: opts.note || null,
    actor_user_id: opts.actorUserId || null,
    invoice_id: opts.invoiceId || null,
    payment_id: opts.paymentId || null,
    idempotency_key: opts.idempotencyKey,
  })

  if (ledErr) {
    if (isMissingRelation(ledErr)) {
      return { ok: false, error: 'LBC Snack Shack tables not migrated yet (023).' }
    }
    if (ledErr.code === '23505') {
      const again = await ensureSnackAccount(opts.schoolId, opts.studentId)
      if (!again) return { ok: false, error: 'Snack account not found.' }
      return { ok: true, account: again, already: true }
    }
    return { ok: false, error: ledErr.message }
  }

  const { error: upErr } = await admin
    .from('snack_accounts')
    .update({
      balance_cents: next.balanceAfter,
      updated_at: new Date().toISOString(),
    })
    .eq('id', acct.id)
    .eq('school_id', opts.schoolId)

  if (upErr) return { ok: false, error: upErr.message }

  return {
    ok: true,
    account: { ...acct, balanceCents: next.balanceAfter },
  }
}

export async function recordSnackPurchase(opts: {
  schoolId: string
  studentId: string
  amountCents: number
  note?: string
  actorUserId: string
}): Promise<{ ok: true; account: SnackAccount } | { ok: false; error: string }> {
  const result = await applyLedgerEntry({
    schoolId: opts.schoolId,
    studentId: opts.studentId,
    entryType: 'debit',
    amountCents: opts.amountCents,
    note: opts.note || 'LBC purchase',
    actorUserId: opts.actorUserId,
    idempotencyKey: `purchase:${crypto.randomUUID()}`,
  })
  if (!result.ok) return result
  return { ok: true, account: result.account }
}

export async function recordCashTopUp(opts: {
  schoolId: string
  studentId: string
  amountCents: number
  note?: string
  actorUserId: string
}): Promise<{ ok: true; account: SnackAccount } | { ok: false; error: string }> {
  const result = await applyLedgerEntry({
    schoolId: opts.schoolId,
    studentId: opts.studentId,
    entryType: 'credit',
    amountCents: opts.amountCents,
    note: opts.note || 'Cash / office top-up',
    actorUserId: opts.actorUserId,
    idempotencyKey: `cash_topup:${crypto.randomUUID()}`,
  })
  if (!result.ok) return result
  return { ok: true, account: result.account }
}

/** After Stripe settles a snack top-up invoice — idempotent credit. */
export async function creditSnackFromPaidInvoice(opts: {
  schoolId: string
  invoiceId: string
  paymentId?: string | null
}): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
  const invoice = await loadInvoiceById(opts.schoolId, opts.invoiceId)
  if (!invoice) return { ok: false, error: 'Invoice not found.' }

  const parsed = parseSnackTopUpSourceKey(invoice.sourceKey)
  if (!parsed) return { ok: true, already: true } // not a snack invoice

  const studentId = invoice.studentId || parsed.studentId
  const result = await applyLedgerEntry({
    schoolId: opts.schoolId,
    studentId,
    entryType: 'credit',
    amountCents: invoice.amountCents,
    note: `Parent load — ${invoice.description}`,
    invoiceId: invoice.id,
    paymentId: opts.paymentId || null,
    idempotencyKey: snackTopUpIdempotencyKey(invoice.id),
  })
  if (!result.ok) return result
  return { ok: true, already: result.already }
}

export async function createSnackTopUpInvoice(opts: {
  schoolId: string
  studentId: string
  parentEmail: string
  familyName: string
  amountCents: number
}): Promise<
  | { ok: true; invoice: BillingInvoice; payPath: string }
  | { ok: false; error: string }
> {
  const amount = Math.round(opts.amountCents)
  if (amount < 100) return { ok: false, error: 'Minimum top-up is $1.00.' }
  if (amount > 200_00) return { ok: false, error: 'Maximum top-up is $200.00.' }

  const acct = await ensureSnackAccount(opts.schoolId, opts.studentId)
  if (!acct) return { ok: false, error: 'Student not found.' }

  const product = await ensureProductByCode(opts.schoolId, LBC_PRODUCT_CODE, {
    name: LBC_LABEL,
    description: 'Parent load funds for snack purchases',
    amountCents: 0,
    currency: 'USD',
    frequency: 'one_time',
    active: true,
    qbItemId: null,
  })

  const topUpId = crypto.randomUUID()
  const invoiceId = crypto.randomUUID()
  const portalToken = newPortalToken()
  const invoice: BillingInvoice = {
    id: invoiceId,
    studentId: opts.studentId,
    familyName: opts.familyName || acct.studentName,
    parentEmail: opts.parentEmail.trim().toLowerCase(),
    productId: product.id,
    description: `${LBC_LABEL} top-up — ${acct.studentName}`,
    amountCents: amount,
    currency: 'USD',
    status: 'open',
    dueDate: new Date().toISOString().slice(0, 10),
    qbInvoiceId: null,
    sourceKey: snackTopUpSourceKey(opts.studentId, topUpId),
    portalToken,
    lastRemindedAt: null,
    reminderCount: 0,
    planId: null,
    installmentIndex: null,
    createdAt: new Date().toISOString(),
  }

  await addInvoice(opts.schoolId, invoice)
  const saved = await loadInvoiceById(opts.schoolId, invoiceId)
  if (!saved) {
    // Idempotent race — find by source key
    const admin = createAdminClient()
    const { data } = await admin
      .from('billing_invoices')
      .select('id, portal_token')
      .eq('school_id', opts.schoolId)
      .eq('source_key', invoice.sourceKey)
      .maybeSingle()
    if (!data?.portal_token) return { ok: false, error: 'Could not create top-up invoice.' }
    return {
      ok: true,
      invoice: { ...invoice, id: String(data.id), portalToken: String(data.portal_token) },
      payPath: `/pay/${data.portal_token}`,
    }
  }

  return {
    ok: true,
    invoice: saved,
    payPath: `/pay/${saved.portalToken}`,
  }
}

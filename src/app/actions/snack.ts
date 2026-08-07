'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSchoolStaff, isLeadership } from '@/lib/roles'
import { parentCanViewStudent } from '@/lib/gradebook-data'
import {
  createSnackTopUpInvoice,
  listSnackAccountsForParent,
  listSnackAccountsForSchool,
  listRecentLedger,
  recordCashTopUp,
  recordSnackPurchase,
  ensureSnackAccount,
} from '@/lib/snack/store'
import { LBC_TOP_UP_PRESETS_CENTS } from '@/lib/snack/ledger'

export type SnackActionResult =
  | {
      ok: true
      payPath?: string
      balanceCents?: number
      note?: string
    }
  | { ok: false; error: string }

async function requireProfile() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.school_id) {
    return { ok: false as const, error: 'Profile or school not set up.' }
  }

  return { ok: true as const, user, admin, profile }
}

export async function loadParentLbcAccounts(): Promise<
  | { ok: true; accounts: Awaited<ReturnType<typeof listSnackAccountsForParent>> }
  | { ok: false; error: string }
> {
  const access = await requireProfile()
  if (!access.ok) return access
  if (access.profile.role !== 'parent') {
    return { ok: false, error: 'Parents only.' }
  }
  const accounts = await listSnackAccountsForParent(
    access.profile.school_id!,
    access.user.id
  )
  return { ok: true, accounts }
}

export async function parentCreateLbcTopUp(input: {
  studentId: string
  amountCents: number
}): Promise<SnackActionResult> {
  const access = await requireProfile()
  if (!access.ok) return access
  if (access.profile.role !== 'parent') {
    return { ok: false, error: 'Parents only.' }
  }

  const schema = z.object({
    studentId: z.string().uuid(),
    amountCents: z.number().int().positive(),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid top-up request.' }

  const allowed = await parentCanViewStudent(access.user.id, parsed.data.studentId)
  if (!allowed) return { ok: false, error: 'That student is not linked to your account.' }

  const email = access.profile.email?.trim()
  if (!email) return { ok: false, error: 'Your profile needs an email to pay.' }

  const result = await createSnackTopUpInvoice({
    schoolId: access.profile.school_id!,
    studentId: parsed.data.studentId,
    parentEmail: email,
    familyName: access.profile.full_name || 'Family',
    amountCents: parsed.data.amountCents,
  })
  if (!result.ok) return result

  revalidatePath('/dashboard')
  return { ok: true, payPath: result.payPath, note: 'Open pay link to load LBC funds.' }
}

export async function staffRecordLbcPurchase(input: {
  studentId: string
  amountCents: number
  note?: string
}): Promise<SnackActionResult> {
  const access = await requireProfile()
  if (!access.ok) return access
  if (!isSchoolStaff(access.profile.role)) {
    return { ok: false, error: 'Staff only.' }
  }

  const schema = z.object({
    studentId: z.string().uuid(),
    amountCents: z.number().int().positive().max(100_00),
    note: z.string().trim().max(200).optional(),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid purchase.' }

  const result = await recordSnackPurchase({
    schoolId: access.profile.school_id!,
    studentId: parsed.data.studentId,
    amountCents: parsed.data.amountCents,
    note: parsed.data.note,
    actorUserId: access.user.id,
  })
  if (!result.ok) return result

  revalidatePath('/principal/billing')
  revalidatePath('/dashboard')
  return {
    ok: true,
    balanceCents: result.account.balanceCents,
    note: `Charged. New balance $${(result.account.balanceCents / 100).toFixed(2)}.`,
  }
}

export async function staffRecordLbcCashTopUp(input: {
  studentId: string
  amountCents: number
  note?: string
}): Promise<SnackActionResult> {
  const access = await requireProfile()
  if (!access.ok) return access
  if (!isLeadership(access.profile.role) && access.profile.role !== 'staff') {
    return { ok: false, error: 'Office staff only.' }
  }

  const schema = z.object({
    studentId: z.string().uuid(),
    amountCents: z.number().int().positive().max(200_00),
    note: z.string().trim().max(200).optional(),
  })
  const parsed = schema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid top-up.' }

  const result = await recordCashTopUp({
    schoolId: access.profile.school_id!,
    studentId: parsed.data.studentId,
    amountCents: parsed.data.amountCents,
    note: parsed.data.note,
    actorUserId: access.user.id,
  })
  if (!result.ok) return result

  revalidatePath('/principal/billing')
  return {
    ok: true,
    balanceCents: result.account.balanceCents,
    note: `Loaded. Balance $${(result.account.balanceCents / 100).toFixed(2)}.`,
  }
}

export async function staffEnsureLbcAccount(studentId: string): Promise<SnackActionResult> {
  const access = await requireProfile()
  if (!access.ok) return access
  if (!isSchoolStaff(access.profile.role)) {
    return { ok: false, error: 'Staff only.' }
  }
  const parsed = z.string().uuid().safeParse(studentId)
  if (!parsed.success) return { ok: false, error: 'Invalid student.' }
  const acct = await ensureSnackAccount(access.profile.school_id!, parsed.data)
  if (!acct) return { ok: false, error: 'Student not found.' }
  return { ok: true, balanceCents: acct.balanceCents }
}

export async function staffListLbcAccounts() {
  const access = await requireProfile()
  if (!access.ok) return access
  if (!isSchoolStaff(access.profile.role)) {
    return { ok: false as const, error: 'Staff only.' }
  }
  const accounts = await listSnackAccountsForSchool(access.profile.school_id!)
  return { ok: true as const, accounts }
}

export async function staffListLbcLedger(accountId: string) {
  const access = await requireProfile()
  if (!access.ok) return access
  if (!isSchoolStaff(access.profile.role)) {
    return { ok: false as const, error: 'Staff only.' }
  }
  const entries = await listRecentLedger(access.profile.school_id!, accountId, 30)
  return { ok: true as const, entries }
}

export { LBC_TOP_UP_PRESETS_CENTS }

'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  listPilotFeedback,
  submitPilotFeedback,
  updatePilotFeedbackStatus,
} from '@/lib/pilot-feedback/store'
import type { FeedbackCategory, FeedbackStatus, PilotFeedback } from '@/lib/pilot-feedback/types'
import { effectiveRole } from '@/lib/roles'

const CATEGORIES: FeedbackCategory[] = ['idea', 'issue', 'question', 'other']

export async function submitPilotFeedbackAction(input: {
  category: string
  message: string
  pagePath?: string | null
  pageTitle?: string | null
  userAgent?: string | null
}): Promise<
  | { ok: true; emailed: boolean; pushed: boolean; note: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Please sign in to send a suggestion.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const category = CATEGORIES.includes(input.category as FeedbackCategory)
    ? (input.category as FeedbackCategory)
    : 'other'

  const result = await submitPilotFeedback({
    schoolId: profile?.school_id ?? null,
    userId: user.id,
    role: profile?.role ?? null,
    category,
    message: input.message,
    pagePath: input.pagePath?.slice(0, 500) ?? null,
    pageTitle: input.pageTitle?.slice(0, 200) ?? null,
    userAgent: input.userAgent?.slice(0, 400) ?? null,
  })

  if (!result.ok) return result

  // Primary destination: product owner email (you) — principal is not notified.
  const { notifyOwnerOfPilotFeedback } = await import(
    '@/lib/pilot-feedback/notify-owner'
  )
  const notify = await notifyOwnerOfPilotFeedback({
    feedbackId: result.id,
    schoolId: profile?.school_id ?? null,
    category,
    message: input.message.trim(),
    pagePath: input.pagePath?.slice(0, 500) ?? null,
    pageTitle: input.pageTitle?.slice(0, 200) ?? null,
    submitterName: profile?.full_name ?? null,
    submitterEmail: profile?.email ?? user.email ?? null,
    role: profile?.role ?? null,
  })

  return {
    ok: true,
    emailed: notify.emailed,
    pushed: notify.pushed,
    note: notify.note,
  }
}

export async function listPilotFeedbackAction(): Promise<
  { ok: true; items: PilotFeedback[] } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('school_id, role, email')
    .eq('id', user.id)
    .maybeSingle()

  const role = effectiveRole(
    profile
      ? {
          role: profile.role as 'admin' | 'teacher' | 'parent' | 'staff' | 'principal',
          email: profile.email as string | null,
        }
      : null
  )
  if (!profile?.school_id || (role !== 'principal' && role !== 'admin' && role !== 'staff')) {
    return { ok: false, error: 'Only school leadership can review pilot feedback.' }
  }

  const items = await listPilotFeedback(profile.school_id)
  return { ok: true, items }
}

export async function updatePilotFeedbackStatusAction(input: {
  id: string
  status: FeedbackStatus
  staffNotes?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('school_id, role, email')
    .eq('id', user.id)
    .maybeSingle()

  const role = effectiveRole(
    profile
      ? {
          role: profile.role as 'admin' | 'teacher' | 'parent' | 'staff' | 'principal',
          email: profile.email as string | null,
        }
      : null
  )
  if (!profile?.school_id || (role !== 'principal' && role !== 'admin')) {
    return { ok: false, error: 'Only principal/admin can update status.' }
  }

  return updatePilotFeedbackStatus(
    profile.school_id,
    input.id,
    input.status,
    user.id,
    input.staffNotes ?? null
  )
}

import { createAdminClient } from '@/lib/supabase/admin'
import type { FeedbackCategory, FeedbackStatus, PilotFeedback } from './types'

export type SubmitFeedbackInput = {
  schoolId: string | null
  userId: string
  role: string | null
  category: FeedbackCategory
  message: string
  pagePath: string | null
  pageTitle: string | null
  userAgent: string | null
}

function mapRow(r: Record<string, unknown>): PilotFeedback {
  return {
    id: String(r.id),
    schoolId: (r.school_id as string | null) ?? null,
    userId: (r.user_id as string | null) ?? null,
    role: (r.role as string | null) ?? null,
    category: (r.category as FeedbackCategory) || 'idea',
    message: String(r.message ?? ''),
    pagePath: (r.page_path as string | null) ?? null,
    pageTitle: (r.page_title as string | null) ?? null,
    status: (r.status as FeedbackStatus) || 'new',
    staffNotes: (r.staff_notes as string | null) ?? null,
    createdAt: String(r.created_at ?? new Date().toISOString()),
  }
}

/**
 * Persist pilot feedback. Prefers pilot_feedback table; falls back to audit_logs
 * so the button always works during pilot even before migration 010.
 */
export async function submitPilotFeedback(
  input: SubmitFeedbackInput
): Promise<{ ok: true; id: string; via: 'table' | 'audit' } | { ok: false; error: string }> {
  const message = input.message.trim()
  if (message.length < 5) {
    return { ok: false, error: 'Please write a bit more so we can act on it (a few words is fine).' }
  }
  if (message.length > 4000) {
    return { ok: false, error: 'Please keep it under 4,000 characters.' }
  }

  const admin = createAdminClient()
  const category = input.category || 'idea'

  const { data, error } = await admin
    .from('pilot_feedback')
    .insert({
      school_id: input.schoolId,
      user_id: input.userId,
      role: input.role,
      category,
      message,
      page_path: input.pagePath,
      page_title: input.pageTitle,
      user_agent: input.userAgent,
      status: 'new',
    })
    .select('id')
    .maybeSingle()

  if (!error && data?.id) {
    await admin.from('audit_logs').insert({
      school_id: input.schoolId,
      user_id: input.userId,
      action: 'pilot.feedback',
      table_name: 'pilot_feedback',
      record_id: data.id,
      details: {
        category,
        page_path: input.pagePath,
        preview: message.slice(0, 200),
      },
    })
    return { ok: true, id: data.id as string, via: 'table' }
  }

  // Table missing or RLS — always land in audit_logs
  const id = crypto.randomUUID()
  const { error: auditErr } = await admin.from('audit_logs').insert({
    school_id: input.schoolId,
    user_id: input.userId,
    action: 'pilot.feedback',
    table_name: 'pilot_feedback',
    record_id: id,
    details: {
      id,
      category,
      message,
      page_path: input.pagePath,
      page_title: input.pageTitle,
      user_agent: input.userAgent,
      role: input.role,
      status: 'new',
      fallback: true,
      table_error: error?.message ?? null,
    },
  })

  if (auditErr) {
    return { ok: false, error: auditErr.message || 'Could not save suggestion.' }
  }
  return { ok: true, id, via: 'audit' }
}

export async function listPilotFeedback(
  schoolId: string,
  limit = 100
): Promise<PilotFeedback[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('pilot_feedback')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (!error && data) {
    const rows = data.map((r) => mapRow(r as Record<string, unknown>))
    const userIds = [...new Set(rows.map((r) => r.userId).filter(Boolean))] as string[]
    if (userIds.length) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
      const map = new Map(
        (profiles ?? []).map((p) => [
          p.id as string,
          { name: p.full_name as string | null, email: p.email as string | null },
        ])
      )
      for (const r of rows) {
        if (r.userId && map.has(r.userId)) {
          r.submitterName = map.get(r.userId)!.name
          r.submitterEmail = map.get(r.userId)!.email
        }
      }
    }
    return rows
  }

  // Fallback: read from audit_logs
  const { data: audits } = await admin
    .from('audit_logs')
    .select('id, user_id, details, created_at, school_id')
    .eq('school_id', schoolId)
    .eq('action', 'pilot.feedback')
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows: PilotFeedback[] = []
  for (const a of audits ?? []) {
    const d = (a.details || {}) as Record<string, unknown>
    if (!d.message && !d.preview) continue
    rows.push({
      id: String(d.id || a.id),
      schoolId: (a.school_id as string | null) ?? schoolId,
      userId: (a.user_id as string | null) ?? null,
      role: (d.role as string | null) ?? null,
      category: (d.category as FeedbackCategory) || 'idea',
      message: String(d.message || d.preview || ''),
      pagePath: (d.page_path as string | null) ?? null,
      pageTitle: (d.page_title as string | null) ?? null,
      status: (d.status as FeedbackStatus) || 'new',
      staffNotes: null,
      createdAt: String(a.created_at ?? new Date().toISOString()),
    })
  }
  return rows
}

export async function updatePilotFeedbackStatus(
  schoolId: string,
  feedbackId: string,
  status: FeedbackStatus,
  reviewedBy: string,
  staffNotes?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('pilot_feedback')
    .update({
      status,
      staff_notes: staffNotes ?? null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewedBy,
    })
    .eq('id', feedbackId)
    .eq('school_id', schoolId)

  if (error) {
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

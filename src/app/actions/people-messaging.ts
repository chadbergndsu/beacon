'use server'

import { revalidatePath } from 'next/cache'
import { queueAndSendBatch } from '@/lib/email/send'
import {
  appBaseUrl,
  familyMessageBodies,
  subjectTag,
} from '@/lib/email/templates'
import {
  resolvePeopleDirectory,
  searchPeopleDirectory,
} from '@/lib/email/people-directory'
import {
  PEOPLE_DELIVERY_LIMIT,
  PEOPLE_RECENT_LIMIT,
  PEOPLE_SELECTION_LIMIT,
  normalizePeopleQuery,
  normalizePeopleRefs,
  type FacultyRole,
  type PeopleMessageResult,
  type PeoplePreview,
  type PeopleRecipientRef,
} from '@/lib/email/people-types'
import { reportError } from '@/lib/ops/report-error'
import { loadSchoolBrand } from '@/lib/school-brand'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const FACULTY_ROLES: FacultyRole[] = ['admin', 'staff', 'principal', 'teacher']
const AUDIT_FAILURE_NOTE = 'Delivery completed. Activity history may be incomplete.'

function emptyPeoplePreview(): PeoplePreview {
  return {
    selectedCount: 0,
    recipientCount: 0,
    selections: [],
    unavailableCount: 0,
  }
}

async function requireFacultyMessagingAccess() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role, full_name')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.school_id) {
    return { ok: false as const, error: 'Profile or school not set up.' }
  }
  if (!FACULTY_ROLES.includes(profile.role as FacultyRole)) {
    return { ok: false as const, error: 'Only faculty can use People messaging.' }
  }

  return {
    ok: true as const,
    admin,
    user,
    profile,
    sender: {
      id: user.id,
      schoolId: profile.school_id,
      role: profile.role as FacultyRole,
    },
  }
}

function parseSubmittedRefs(value: unknown):
  | { ok: true; refs: PeopleRecipientRef[] }
  | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length > PEOPLE_SELECTION_LIMIT) {
    return { ok: false, error: 'Choose no more than 50 recipients.' }
  }
  const refs = normalizePeopleRefs(value)
  if (value.length > 0 && refs.length === 0) {
    return { ok: false, error: 'One or more recipients is invalid.' }
  }
  return { ok: true, refs }
}

export async function searchPeopleRecipients(input: {
  query: unknown
  recent_refs: unknown
}) {
  try {
    const access = await requireFacultyMessagingAccess()
    if (!access.ok) return access

    const query = normalizePeopleQuery(input.query)
    const recentRefs = normalizePeopleRefs(
      Array.isArray(input.recent_refs)
        ? input.recent_refs.slice(0, PEOPLE_RECENT_LIMIT)
        : []
    )
    if (!query && recentRefs.length === 0) {
      return { ok: true as const, results: [] }
    }

    const results = await searchPeopleDirectory(access.sender, query, recentRefs)
    return { ok: true as const, results }
  } catch {
    reportError(new Error('People messaging search failed'), {
      surface: 'people_messaging',
      operation: 'search',
    })
    return { ok: false as const, error: 'Unable to search People right now.' }
  }
}

export async function previewPeopleRecipients(input: { refs: unknown }) {
  try {
    const access = await requireFacultyMessagingAccess()
    if (!access.ok) return access

    const parsed = parseSubmittedRefs(input.refs)
    if (!parsed.ok) return parsed
    if (parsed.refs.length === 0) {
      return { ok: true as const, preview: emptyPeoplePreview() }
    }

    const resolution = await resolvePeopleDirectory(access.sender, parsed.refs)
    return { ok: true as const, preview: resolution.preview }
  } catch {
    reportError(new Error('People messaging preview failed'), {
      surface: 'people_messaging',
      operation: 'preview',
    })
    return { ok: false as const, error: 'Unable to preview recipients right now.' }
  }
}

export async function sendPeopleMessage(input: {
  refs: unknown
  subject: unknown
  body: unknown
}): Promise<PeopleMessageResult> {
  try {
    const access = await requireFacultyMessagingAccess()
    if (!access.ok) return access

    const parsed = parseSubmittedRefs(input.refs)
    if (!parsed.ok) return parsed
    const refs = parsed.refs
    const subject = typeof input.subject === 'string' ? input.subject.trim() : ''
    const body = typeof input.body === 'string' ? input.body.trim() : ''

    if (refs.length === 0) {
      return { ok: false, error: 'Choose at least one recipient.' }
    }
    if (!subject || !body) {
      return { ok: false, error: 'Subject and message are required.' }
    }
    if (subject.length > 200) return { ok: false, error: 'Subject is too long.' }
    if (body.length > 20_000) return { ok: false, error: 'Message is too long.' }

    const resolution = await resolvePeopleDirectory(access.sender, refs)
    if (resolution.rejectedKeys.length > 0) {
      return { ok: false, error: 'One or more recipients is no longer available.' }
    }
    if (resolution.deliveries.length === 0) {
      return { ok: false, error: 'No selected recipient has a usable email address.' }
    }
    if (resolution.deliveries.length > PEOPLE_DELIVERY_LIMIT) {
      return {
        ok: false,
        error: 'Use Groups or Announcements for more than 100 recipients.',
      }
    }

    const brand = await loadSchoolBrand(access.sender.schoolId)
    const author = access.profile.full_name || 'School faculty'
    const bodies = familyMessageBodies({
      brand,
      subject,
      body,
      author,
      appUrl: `${appBaseUrl()}/announcements`,
    })
    const emails = resolution.deliveries.map((recipient) => ({
      school_id: access.sender.schoolId,
      kind: 'message' as const,
      to_email: recipient.email,
      to_name: recipient.name,
      subject: `[${subjectTag(brand)}] ${subject}`,
      body_text: bodies.text,
      body_html: bodies.html,
      meta: { people_message: true, recipient_role: recipient.role },
    }))

    const delivery = await queueAndSendBatch(emails, { brand })
    const bookkeepingContext = {
      schoolId: access.sender.schoolId,
      userId: access.user.id,
      selected: refs.length,
      recipients: emails.length,
      sent: delivery.sent,
      failed: delivery.failed,
      skipped: delivery.skipped,
    }
    let auditFailed = false
    try {
      const { error: auditError } = await access.admin.from('audit_logs').insert({
        school_id: access.sender.schoolId,
        user_id: access.user.id,
        action: 'comms.people',
        table_name: 'email_outbox',
        details: {
          mode: 'people',
          selected: refs.length,
          recipients: emails.length,
          sent: delivery.sent,
          failed: delivery.failed,
          skipped: delivery.skipped,
        },
      })
      if (auditError) {
        auditFailed = true
        reportError(new Error('People messaging audit failed'), {
          surface: 'people_messaging',
          operation: 'audit',
          ...bookkeepingContext,
        })
      }
    } catch {
      auditFailed = true
      reportError(new Error('People messaging audit failed'), {
        surface: 'people_messaging',
        operation: 'audit',
        ...bookkeepingContext,
      })
    }

    try {
      revalidatePath('/admin/emails')
    } catch {
      reportError(new Error('People messaging revalidation failed'), {
        surface: 'people_messaging',
        operation: 'revalidate',
        ...bookkeepingContext,
      })
    }

    const note = [delivery.note, auditFailed ? AUDIT_FAILURE_NOTE : undefined]
      .filter(Boolean)
      .join(' ')
    return {
      ok: true,
      sent: delivery.sent,
      failed: delivery.failed,
      skipped: delivery.skipped,
      ...(note ? { note } : {}),
    }
  } catch {
    reportError(new Error('People messaging send failed'), {
      surface: 'people_messaging',
      operation: 'send',
    })
    return { ok: false, error: 'Unable to send message right now.' }
  }
}

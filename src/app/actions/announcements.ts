'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { queueAndSendBatch, queueAndSendEmail } from '@/lib/email/send'
import { resolveAnnouncementRecipients } from '@/lib/email/recipients'
import {
  announcementBodies,
  appBaseUrl,
  brandedEmailShell,
  escapeHtml,
  subjectTag,
} from '@/lib/email/templates'
import { loadSchoolBrand } from '@/lib/school-brand'

export type ActionResult =
  | { ok: true; id?: string; emailed?: number; emailNote?: string }
  | { ok: false; error: string }

async function requireStaff() {
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
  if (!['admin', 'staff', 'teacher', 'principal'].includes(profile.role)) {
    return { ok: false as const, error: 'Only staff can manage announcements.' }
  }

  return { ok: true as const, user, admin, profile }
}

export async function createAnnouncement(input: {
  title: string
  body: string
  audience: string
  class_id: string | null
  send_email: boolean
}): Promise<ActionResult> {
  const access = await requireStaff()
  if (!access.ok) return access

  const title = input.title.trim()
  const body = input.body.trim()
  if (!title || !body) return { ok: false, error: 'Title and body are required.' }

  const audience = input.audience || 'parents'
  const classId = input.class_id || null

  // Always bind class to this school (prevents cross-tenant class_id IDOR)
  if (classId) {
    const { data: klass } = await access.admin
      .from('classes')
      .select('id, teacher_id, school_id')
      .eq('id', classId)
      .eq('school_id', access.profile.school_id)
      .maybeSingle()
    if (!klass) {
      return { ok: false, error: 'Class not found at your school.' }
    }
    if (access.profile.role === 'teacher' && klass.teacher_id !== access.user.id) {
      return { ok: false, error: 'You can only post announcements for your own classes.' }
    }
  }

  const { data: announcement, error } = await access.admin
    .from('announcements')
    .insert({
      school_id: access.profile.school_id,
      class_id: classId,
      title,
      body,
      author_id: access.user.id,
      audience,
      published_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error || !announcement) {
    return { ok: false, error: error?.message || 'Could not create announcement.' }
  }

  await access.admin.from('audit_logs').insert({
    school_id: access.profile.school_id,
    user_id: access.user.id,
    action: 'announcement.created',
    table_name: 'announcements',
    record_id: announcement.id,
    details: { title, audience, class_id: classId, send_email: input.send_email },
  })

  let emailed = 0
  let emailNote: string | undefined

  if (input.send_email) {
    const recipients = await resolveAnnouncementRecipients({
      schoolId: access.profile.school_id!,
      audience,
      classId,
    })

    if (recipients.length === 0) {
      emailNote =
        'Announcement saved, but no matching parent/staff emails found. Link parent profiles with emails, or choose Staff audience.'
    } else {
      const brand = await loadSchoolBrand(access.profile.school_id)
      const tag = subjectTag(brand)
      const author = access.profile.full_name || 'Beacon'
      const base = appBaseUrl()
      const { text, html } = announcementBodies({
        brand,
        title,
        body,
        author,
        appUrl: `${base}/announcements/${announcement.id}`,
      })

      const batch = recipients.map((r) => ({
        school_id: access.profile.school_id,
        kind: 'announcement' as const,
        to_email: r.email,
        to_name: r.name,
        subject: `[${tag}] ${title}`,
        body_text: text,
        body_html: html,
        related_table: 'announcements',
        related_id: announcement.id,
        meta: { audience, recipient_role: r.role },
      }))

      const result = await queueAndSendBatch(batch, { brand })
      emailed = result.sent + result.skipped
      if (result.note) emailNote = result.note
      else if (result.failed) {
        emailNote = `${result.failed} of ${result.total} failed — check Email outbox to resend.`
      }
    }
  }

  revalidatePath('/announcements')
  revalidatePath('/admin/emails')
  return { ok: true, id: announcement.id, emailed, emailNote }
}

export async function sendSystemEmail(input: {
  to_email: string
  to_name?: string
  subject: string
  body: string
}): Promise<ActionResult> {
  const access = await requireStaff()
  if (!access.ok) return access
  if (!['admin', 'staff', 'principal'].includes(access.profile.role)) {
    return { ok: false, error: 'Only leadership can send freeform system emails.' }
  }

  const to = input.to_email.trim().toLowerCase()
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject || !body) return { ok: false, error: 'Subject and body required.' }
  if (subject.length > 200) return { ok: false, error: 'Subject is too long.' }
  if (body.length > 20_000) return { ok: false, error: 'Message is too long.' }

  // Prefer known school profiles; allow other addresses only when domain matches a school member
  const { data: peers } = await access.admin
    .from('profiles')
    .select('email')
    .eq('school_id', access.profile.school_id)
    .not('email', 'is', null)
    .limit(80)
  const { freeformEmailAllowed } = await import('@/lib/email/freeform-policy')
  const allowed = freeformEmailAllowed(
    to,
    (peers ?? []).map((p) => p.email as string | null)
  )
  if (!allowed.ok) {
    return { ok: false, error: allowed.reason }
  }

  // Soft daily cap per school (in-memory best-effort)
  const { rateLimit } = await import('@/lib/security/rate-limit')
  const rl = rateLimit({
    key: `system-email:${access.profile.school_id}`,
    limit: 40,
    windowMs: 24 * 60 * 60 * 1000,
  })
  if (!rl.ok) {
    return { ok: false, error: 'Daily freeform email limit reached. Try again tomorrow.' }
  }

  const brand = await loadSchoolBrand(access.profile.school_id)
  const tag = subjectTag(brand)

  const result = await queueAndSendEmail(
    {
      school_id: access.profile.school_id,
      kind: 'system',
      to_email: to,
      to_name: input.to_name || null,
      subject: `[${tag}] ${subject}`,
      body_text: `${body}\n\n— ${brand.name}`,
      body_html: brandedEmailShell({
        brand,
        eyebrow: 'School message',
        title: subject,
        bodyHtml: `<div style="white-space:pre-wrap">${escapeHtml(body)}</div>`,
      }),
      related_table: null,
      related_id: null,
      meta: { manual: true },
    },
    { brand }
  )

  revalidatePath('/admin/emails')
  return {
    ok: true,
    id: result.id,
    emailed: result.status === 'sent' || result.status === 'skipped' ? 1 : 0,
    emailNote: result.error,
  }
}

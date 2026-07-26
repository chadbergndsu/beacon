'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { queueAndSendEmail } from '@/lib/email/send'
import { resolveAnnouncementRecipients } from '@/lib/email/recipients'

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
  if (!['admin', 'staff', 'teacher'].includes(profile.role)) {
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

  if (classId && access.profile.role === 'teacher') {
    const { data: klass } = await access.admin
      .from('classes')
      .select('id, teacher_id')
      .eq('id', classId)
      .maybeSingle()
    if (!klass || klass.teacher_id !== access.user.id) {
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
        'No matching parent/staff emails found. Link parent profiles with emails, or choose Staff audience.'
    } else {
      const schoolName = 'Lighthouse Christian Academy'
      const author = access.profile.full_name || 'Beacon'
      const text = [
        title,
        '',
        body,
        '',
        `— ${author}`,
        schoolName,
        '',
        'Sent by Beacon gradebook system.',
      ].join('\n')

      const html = `
        <div style="font-family: system-ui, sans-serif; max-width: 560px; line-height: 1.5;">
          <p style="color:#0369a1;font-size:12px;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">
            ${schoolName} · Beacon
          </p>
          <h1 style="font-size:20px;margin:0 0 12px;">${escapeHtml(title)}</h1>
          <div style="white-space:pre-wrap;color:#0f172a;">${escapeHtml(body)}</div>
          <p style="margin-top:24px;color:#64748b;font-size:13px;">— ${escapeHtml(author)}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
          <p style="color:#94a3b8;font-size:12px;">This is a system email from Beacon. Do not reply to this message.</p>
        </div>
      `

      for (const r of recipients) {
        const result = await queueAndSendEmail({
          school_id: access.profile.school_id,
          kind: 'announcement',
          to_email: r.email,
          to_name: r.name,
          subject: `[Beacon] ${title}`,
          body_text: text,
          body_html: html,
          related_table: 'announcements',
          related_id: announcement.id,
          meta: { audience, recipient_role: r.role },
        })
        if (result.status === 'sent' || result.status === 'skipped') emailed++
        if (result.status === 'skipped' && !emailNote) {
          emailNote =
            'Emails were queued/logged but not delivered. Add RESEND_API_KEY to send real mail.'
        }
      }
    }
  }

  revalidatePath('/announcements')
  revalidatePath('/admin/emails')
  return { ok: true, id: announcement.id, emailed, emailNote }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendSystemEmail(input: {
  to_email: string
  to_name?: string
  subject: string
  body: string
}): Promise<ActionResult> {
  const access = await requireStaff()
  if (!access.ok) return access
  if (!['admin', 'staff'].includes(access.profile.role)) {
    return { ok: false, error: 'Only admin/staff can send freeform system emails.' }
  }

  const to = input.to_email.trim()
  if (!to.includes('@')) return { ok: false, error: 'Valid email required.' }
  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject || !body) return { ok: false, error: 'Subject and body required.' }

  const result = await queueAndSendEmail({
    school_id: access.profile.school_id,
    kind: 'system',
    to_email: to,
    to_name: input.to_name || null,
    subject: `[Beacon] ${subject}`,
    body_text: `${body}\n\n— Beacon system message\nLighthouse Christian Academy`,
    body_html: `<div style="font-family:system-ui,sans-serif"><p>${escapeHtml(body).replace(/\n/g, '<br/>')}</p><p style="color:#64748b;font-size:13px">— Beacon system</p></div>`,
    related_table: null,
    related_id: null,
    meta: { manual: true },
  })

  revalidatePath('/admin/emails')
  return {
    ok: true,
    id: result.id,
    emailed: result.status === 'sent' || result.status === 'skipped' ? 1 : 0,
    emailNote: result.error,
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { queueAndSendBatch, queueAndSendEmail, resendOutboxRow } from '@/lib/email/send'
import {
  previewRecipients,
  resolveAnnouncementRecipients,
} from '@/lib/email/recipients'
import {
  appBaseUrl,
  familyMessageBodies,
  brandedEmailShell,
  escapeHtml,
  plainFooter,
  subjectTag,
} from '@/lib/email/templates'
import { emailDinnerDigestForStudent } from '@/lib/email/digest-email'
import {
  canAccessClass,
  teacherCanViewStudent,
  type ClassRow,
} from '@/lib/gradebook-data'
import { mayEmailStudentDinnerDigest } from '@/lib/email/digest-access'
import { loadSchoolBrand } from '@/lib/school-brand'
import { canSendSystemEmail, isSchoolStaff } from '@/lib/roles'

export type CommsResult =
  | {
      ok: true
      emailed?: number
      failed?: number
      skipped?: number
      emailNote?: string
      count?: number
      sample?: string[]
    }
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
  if (!isSchoolStaff(profile.role)) {
    return { ok: false as const, error: 'Only staff can use communications.' }
  }

  return { ok: true as const, user, admin, profile }
}

export async function previewComposeRecipients(input: {
  audience: string
  class_id?: string | null
}): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access

  const preview = await previewRecipients({
    schoolId: access.profile.school_id!,
    audience: input.audience || 'parents',
    classId: input.class_id || null,
  })

  return {
    ok: true,
    count: preview.count,
    sample: preview.sample,
    emailNote: preview.missingParentsNote,
  }
}

/**
 * Compose a message to an audience (parents / class / staff) — the main
 * production communication action schools actually use day-to-day.
 */
export async function composeFamilyMessage(input: {
  subject: string
  body: string
  audience: string
  class_id?: string | null
  also_slack?: boolean
}): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access

  if (!canSendSystemEmail(access.profile.role) && access.profile.role !== 'teacher') {
    return { ok: false, error: 'Not allowed to send school messages.' }
  }

  const subject = input.subject.trim()
  const body = input.body.trim()
  if (!subject || !body) return { ok: false, error: 'Subject and body are required.' }
  if (subject.length > 200) return { ok: false, error: 'Subject is too long.' }
  if (body.length > 20000) return { ok: false, error: 'Message is too long.' }

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
      return { ok: false, error: 'You can only message families in your own classes.' }
    }
  }

  if (access.profile.role === 'teacher' && !classId && audience !== 'teachers') {
    return {
      ok: false,
      error: 'Teachers: pick a class so only those families are emailed.',
    }
  }

  const recipients = await resolveAnnouncementRecipients({
    schoolId: access.profile.school_id!,
    audience,
    classId,
  })

  if (!recipients.length) {
    return {
      ok: false,
      error:
        'No matching emails found. Link parent profiles to students, or choose a staff audience.',
    }
  }

  const brand = await loadSchoolBrand(access.profile.school_id)
  const tag = subjectTag(brand)
  const author = access.profile.full_name || 'School office'
  const base = appBaseUrl()
  const { text, html } = familyMessageBodies({
    brand,
    subject,
    body,
    author,
    appUrl: `${base}/announcements`,
  })

  const batch = recipients.map((r) => ({
    school_id: access.profile.school_id,
    kind: 'message' as const,
    to_email: r.email,
    to_name: r.name,
    subject: `[${tag}] ${subject}`,
    body_text: text,
    body_html: html,
    related_table: classId ? 'classes' : null,
    related_id: classId,
    meta: {
      audience,
      class_id: classId,
      manual_compose: true,
      recipient_role: r.role,
    },
  }))

  const result = await queueAndSendBatch(batch, { brand })

  let slackNote: string | undefined
  if (input.also_slack && canSendSystemEmail(access.profile.role)) {
    try {
      const { isSlackConfigured, publishSlack } = await import('@/lib/notify/slack')
      if (isSlackConfigured()) {
        const slack = await publishSlack({
          title: `${brand.shortName} · Family message`,
          text: `*${subject}*\n${body.slice(0, 500)}${body.length > 500 ? '…' : ''}`,
          fields: [
            { label: 'Audience', value: audience },
            { label: 'Recipients', value: String(recipients.length) },
            { label: 'Author', value: author },
          ],
          link: { label: 'Open Comms', url: `${base}/admin/emails` },
        })
        slackNote = slack.ok
          ? 'Also posted to Slack.'
          : slack.skipped
            ? undefined
            : `Slack: ${slack.error || 'failed'}`
      }
    } catch {
      /* Slack best-effort */
    }
  }

  await access.admin.from('audit_logs').insert({
    school_id: access.profile.school_id,
    user_id: access.user.id,
    action: 'comms.compose',
    table_name: 'email_outbox',
    details: {
      subject,
      audience,
      class_id: classId,
      recipients: recipients.length,
      sent: result.sent,
      failed: result.failed,
      skipped: result.skipped,
      also_slack: Boolean(input.also_slack),
    },
  })

  revalidatePath('/admin/emails')
  return {
    ok: true,
    emailed: result.sent,
    failed: result.failed,
    skipped: result.skipped,
    emailNote: [result.note, slackNote].filter(Boolean).join(' ') || undefined,
  }
}

/** Send a test email to the signed-in staff member — prove delivery works. */
export async function sendTestEmail(): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access

  const to = access.profile.email?.trim()
  if (!to || !to.includes('@')) {
    return { ok: false, error: 'Your profile has no email address.' }
  }

  const brand = await loadSchoolBrand(access.profile.school_id)
  const tag = subjectTag(brand)
  const live = Boolean(process.env.RESEND_API_KEY)
  const mode = live ? 'LIVE (Resend)' : 'LOG-ONLY (no RESEND_API_KEY yet)'

  const bodyText = [
    `Hello ${access.profile.full_name || 'there'},`,
    '',
    `This is a Beacon delivery test for ${brand.name}.`,
    '',
    `Mode: ${mode}`,
    `From: ${process.env.EMAIL_FROM || 'default'}`,
    `Reply-To: ${brand.email || process.env.EMAIL_REPLY_TO || '(not set — add school contact email on Go-live)'}`,
    '',
    live
      ? 'If you received this in your inbox, parent emails will deliver the same way.'
      : 'No Resend key is set — this was logged to the outbox only. Add RESEND_API_KEY on Vercel, then test again.',
    '',
    plainFooter(brand),
  ].join('\n')

  const html = brandedEmailShell({
    brand,
    eyebrow: 'Delivery test',
    title: 'Beacon email is working',
    bodyHtml: `
      <p>Hello ${escapeHtml(access.profile.full_name || 'there')},</p>
      <p>This is a delivery test for <strong>${escapeHtml(brand.name)}</strong>.</p>
      <div style="margin:16px 0;padding:12px 14px;border-radius:12px;background:${live ? '#ecfdf5' : '#fffbeb'};border:1px solid ${live ? '#a7f3d0' : '#fde68a'}">
        <p style="margin:0;font-weight:700;color:${live ? '#065f46' : '#92400e'}">Mode: ${escapeHtml(mode)}</p>
        <p style="margin:8px 0 0;font-size:13px;color:#475569">From: ${escapeHtml(process.env.EMAIL_FROM || 'default')}</p>
      </div>
      <p style="font-size:14px;color:#475569">${
        live
          ? 'If this landed in your inbox (check spam once), announcement and family messages will use the same path.'
          : 'Add <code>RESEND_API_KEY</code> on Vercel + a verified domain, then send this test again.'
      }</p>
    `,
  })

  const result = await queueAndSendEmail(
    {
      school_id: access.profile.school_id,
      kind: 'test',
      to_email: to,
      to_name: access.profile.full_name,
      subject: `[${tag}] Beacon delivery test`,
      body_text: bodyText,
      body_html: html,
      meta: { test: true, mode },
    },
    { brand }
  )

  revalidatePath('/admin/emails')
  revalidatePath('/principal/release')

  if (result.status === 'failed') {
    return { ok: false, error: result.error || 'Test email failed.' }
  }

  return {
    ok: true,
    emailed: 1,
    emailNote:
      result.status === 'skipped'
        ? 'Logged to outbox only. Set RESEND_API_KEY for real delivery.'
        : `Sent to ${to}. Check inbox (and spam) in the next minute.`,
  }
}

/** Prove Slack webhook/bot delivery from Comms (leadership / office admin). */
export async function sendTestSlack(): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access
  if (!canSendSystemEmail(access.profile.role)) {
    return { ok: false, error: 'Only leadership can send Slack tests.' }
  }

  const { isSlackConfigured, publishSlack, slackConfigMode } = await import(
    '@/lib/notify/slack'
  )
  if (!isSlackConfigured()) {
    return {
      ok: false,
      error:
        'Slack is not configured. Set BEACON_SLACK_WEBHOOK_URL (or BEACON_SLACK_BOT_TOKEN + BEACON_SLACK_CHANNEL) on Vercel.',
    }
  }

  const brand = await loadSchoolBrand(access.profile.school_id)
  const mode = slackConfigMode()
  const who = access.profile.full_name || access.profile.email || 'Staff'
  const result = await publishSlack({
    title: `${brand.shortName} · Slack delivery test`,
    text: `Beacon Slack is working for *${brand.name}*.\nSent by ${who}.`,
    fields: [
      { label: 'Mode', value: mode || 'unknown' },
      { label: 'School', value: brand.name },
    ],
  })

  if (!result.ok) {
    return { ok: false, error: result.error || 'Slack test failed.' }
  }

  return {
    ok: true,
    emailNote: `Posted to Slack (${mode}). Check your office channel.`,
  }
}

export async function resendFailedEmail(outboxId: string): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access
  if (!canSendSystemEmail(access.profile.role)) {
    return { ok: false, error: 'Only leadership can resend failed emails.' }
  }

  const { data: row } = await access.admin
    .from('email_outbox')
    .select('*')
    .eq('id', outboxId)
    .maybeSingle()

  if (!row || row.school_id !== access.profile.school_id) {
    return { ok: false, error: 'Outbox row not found.' }
  }
  if (row.status === 'sent') {
    return { ok: false, error: 'That message already sent successfully.' }
  }

  const brand = await loadSchoolBrand(access.profile.school_id)
  const result = await resendOutboxRow(row, brand)

  revalidatePath('/admin/emails')

  if (result.status === 'failed') {
    return { ok: false, error: result.error || 'Resend failed.' }
  }

  return {
    ok: true,
    emailed: 1,
    emailNote:
      result.status === 'skipped'
        ? 'Still log-only — configure RESEND_API_KEY.'
        : 'Resent successfully.',
  }
}

export async function emailStudentDinnerDigest(
  studentId: string
): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access

  const schoolId = access.profile.school_id!
  const { data: student } = await access.admin
    .from('students')
    .select('id, school_id')
    .eq('id', studentId)
    .maybeSingle()

  if (!student || student.school_id !== schoolId) {
    return { ok: false, error: 'Student not found at your school.' }
  }

  const teacherOwns =
    access.profile.role === 'teacher'
      ? await teacherCanViewStudent(access.user.id, studentId, schoolId)
      : false

  if (
    !mayEmailStudentDinnerDigest({
      role: access.profile.role,
      teacherOwnsStudent: teacherOwns,
    })
  ) {
    return {
      ok: false,
      error:
        access.profile.role === 'teacher'
          ? 'You can only email Dinner Table Digests for students in your classes.'
          : 'Not allowed to email dinner digests.',
    }
  }

  const result = await emailDinnerDigestForStudent({
    studentId,
    schoolId,
    actorUserId: access.user.id,
  })

  revalidatePath('/admin/emails')
  revalidatePath(`/students/${studentId}`)

  if (result.sent === 0 && result.skipped === 0) {
    return { ok: false, error: result.note || 'No emails sent.' }
  }

  return {
    ok: true,
    emailed: result.sent,
    failed: result.failed,
    skipped: result.skipped,
    emailNote: result.note,
  }
}

/**
 * Email Dinner Table Digest for every student enrolled in a class.
 * Teachers: only their own classes. Leadership: any class at school.
 */
export async function emailClassDinnerDigests(
  classId: string
): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access

  const schoolId = access.profile.school_id!
  const { data: klass } = await access.admin
    .from('classes')
    .select('id, name, subject, grade_level, term, teacher_id, school_id, active')
    .eq('id', classId)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (!klass) {
    return { ok: false, error: 'Class not found at your school.' }
  }

  if (
    !canAccessClass(access.profile, access.user, klass as ClassRow) ||
    access.profile.role === 'parent'
  ) {
    return { ok: false, error: 'You do not have access to this class.' }
  }

  const { data: enrollRows } = await access.admin
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)

  const studentIds = [
    ...new Set((enrollRows ?? []).map((r) => String(r.student_id)).filter(Boolean)),
  ]
  if (!studentIds.length) {
    return { ok: false, error: 'No students enrolled in this class.' }
  }

  let emailed = 0
  let failed = 0
  let skipped = 0
  const notes: string[] = []

  for (const studentId of studentIds) {
    const result = await emailDinnerDigestForStudent({
      studentId,
      schoolId,
      actorUserId: access.user.id,
    })
    emailed += result.sent
    failed += result.failed
    skipped += result.skipped
    if (result.note && result.sent === 0) notes.push(result.note)
  }

  revalidatePath('/admin/emails')
  revalidatePath(`/classes/${classId}`)

  if (emailed === 0 && failed === 0 && skipped === 0) {
    return {
      ok: false,
      error: notes[0] || 'No digest emails sent (no parent emails linked?).',
    }
  }

  return {
    ok: true,
    emailed,
    failed,
    skipped,
    emailNote: `Class digests: ${emailed} sent, ${failed} failed, ${skipped} skipped across ${studentIds.length} student(s).`,
  }
}

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
    },
  })

  revalidatePath('/admin/emails')
  return {
    ok: true,
    emailed: result.sent,
    failed: result.failed,
    skipped: result.skipped,
    emailNote:
      result.note ||
      (result.failed
        ? `${result.failed} failed — check outbox errors and resend.`
        : undefined),
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

/**
 * Staff smoke-test: insert a synthetic parent reply against a recent outbox row
 * (or a freshly minted test send). Does not call the public webhook — no secrets required.
 */
export async function simulateParentReply(input?: {
  body?: string
}): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access
  if (!canSendSystemEmail(access.profile.role)) {
    return { ok: false, error: 'Only office leadership can simulate replies.' }
  }

  const schoolId = access.profile.school_id!
  const brand = await loadSchoolBrand(schoolId)
  const { generateReplyToken, buildInboundReplyTo, isEmailInboundConfigured } =
    await import('@/lib/email/reply-routing')
  const { ingestInboundEmail } = await import('@/lib/email/inbound')
  const { rateLimit } = await import('@/lib/security/rate-limit')

  const rl = rateLimit({
    key: `simulate-reply:${schoolId}:${access.user.id}`,
    limit: 20,
    windowMs: 60 * 60 * 1000,
  })
  if (!rl.ok) {
    return { ok: false, error: 'Too many simulate replies — try again later.' }
  }

  // Prefer a recent outbox row that already has a reply_token
  let withToken: {
    id: string
    to_email: string
    to_name: string | null
    subject: string
    reply_token: string | null
  } | null = null
  {
    const { data, error } = await access.admin
      .from('email_outbox')
      .select('id, to_email, to_name, subject, reply_token, meta')
      .eq('school_id', schoolId)
      .not('reply_token', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error && /reply_token|column/i.test(error.message)) {
      return {
        ok: false,
        error: 'Migration 023 not applied — run npm run db:migrate for email_inbox / reply_token.',
      }
    }
    withToken = data
  }

  let outboxId = withToken?.id as string | undefined
  let replyToken = (withToken?.reply_token as string | null) || null
  const parentEmail = (withToken?.to_email as string | undefined) || access.profile.email
  const parentName = (withToken?.to_name as string | null) || access.profile.full_name
  let subject = (withToken?.subject as string | undefined) || 'Beacon delivery test'

  if (!replyToken) {
    // Mint a log-only test send that carries a token even when inbound env is off
    replyToken = generateReplyToken()
    const tag = subjectTag(brand)
    const minted = await queueAndSendEmail(
      {
        school_id: schoolId,
        kind: 'test',
        to_email: parentEmail || 'office@example.com',
        to_name: parentName,
        subject: `[${tag}] Beacon reply-capture seed`,
        body_text: `Seed message for reply capture smoke test.\n\n${plainFooter(brand)}`,
        body_html: brandedEmailShell({
          brand,
          eyebrow: 'Reply capture',
          title: 'Seed message',
          bodyHtml: '<p>This seed exists so Comms can simulate a parent reply.</p>',
        }),
        reply_token: replyToken,
        meta: { simulate_seed: true },
      },
      { brand }
    )
    // When inbound env is off, queueAndSendEmail won't set reply_token column —
    // force-update the row so correlation works for the smoke test.
    outboxId = minted.id
    if (outboxId && outboxId !== 'unknown') {
      await access.admin
        .from('email_outbox')
        .update({
          reply_token: replyToken,
          meta: {
            simulate_seed: true,
            reply_token: replyToken,
            ...(isEmailInboundConfigured()
              ? { reply_to: buildInboundReplyTo(replyToken) }
              : {}),
          },
        })
        .eq('id', outboxId)
        .eq('school_id', schoolId)
    }
    subject = `[${tag}] Beacon reply-capture seed`
  }

  if (!parentEmail?.includes('@')) {
    return { ok: false, error: 'Need a parent/staff email on the outbox or your profile.' }
  }

  const body =
    input?.body?.trim() ||
    `Hi — this is a simulated parent reply for the smoke test.\n\nThanks,\n${parentName || 'Parent'}`

  const inboundTo =
    buildInboundReplyTo(replyToken!) || `reply+${replyToken}@simulate.local`

  const result = await ingestInboundEmail({
    from: `${parentName || 'Parent'} <${parentEmail}>`,
    fromName: parentName,
    to: inboundTo,
    subject: subject.startsWith('Re:') ? subject : `Re: ${subject}`,
    bodyText: body.slice(0, 4000),
    provider: 'simulate',
    providerMessageId: `simulate:${schoolId}:${Date.now()}:${replyToken!.slice(0, 12)}`,
    replyToken: replyToken!,
    schoolId,
    meta: { simulated_by: access.user.id },
  })

  if (!result.ok) {
    return { ok: false, error: result.error }
  }

  await access.admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: access.user.id,
    action: 'email.inbound_simulated',
    table_name: 'email_inbox',
    record_id: result.id === 'unmatched' ? null : result.id,
    details: { outbox_id: outboxId, reply_token: replyToken },
  })

  revalidatePath('/admin/emails')
  revalidatePath('/messages')
  revalidatePath('/principal/release')

  return {
    ok: true,
    emailNote: result.unmatched
      ? 'Simulated reply stored (unmatched outbox — check migration 023 / reply_token).'
      : 'Simulated parent reply logged in Inbox. Open it below.',
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

export async function updateInboxStatus(
  inboxId: string,
  status: 'received' | 'reviewed' | 'archived' | 'spam'
): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access
  if (!canSendSystemEmail(access.profile.role) && access.profile.role !== 'teacher') {
    return { ok: false, error: 'Not allowed to update inbox.' }
  }

  const schoolId = access.profile.school_id!
  const { data: row } = await access.admin
    .from('email_inbox')
    .select('id, school_id')
    .eq('id', inboxId)
    .maybeSingle()

  if (!row || row.school_id !== schoolId) {
    return { ok: false, error: 'Reply not found.' }
  }

  const { error } = await access.admin
    .from('email_inbox')
    .update({
      status,
      reviewed_at: status === 'received' ? null : new Date().toISOString(),
      reviewed_by: status === 'received' ? null : access.user.id,
    })
    .eq('id', inboxId)
    .eq('school_id', schoolId)

  if (error) return { ok: false, error: 'Could not update reply status.' }

  revalidatePath('/admin/emails')
  return { ok: true }
}

/**
 * Staff reply to a logged parent inbound message — sends email + new outbox row.
 */
export async function replyToInboxMessage(input: {
  inboxId: string
  body: string
}): Promise<CommsResult> {
  const access = await requireStaff()
  if (!access.ok) return access
  if (!canSendSystemEmail(access.profile.role)) {
    return { ok: false, error: 'Only office leadership can reply from Comms.' }
  }

  const body = input.body?.trim() || ''
  if (body.length < 2) return { ok: false, error: 'Write a short reply.' }
  if (body.length > 8000) return { ok: false, error: 'Reply is too long.' }

  const schoolId = access.profile.school_id!
  const { data: inbox } = await access.admin
    .from('email_inbox')
    .select('*')
    .eq('id', input.inboxId)
    .eq('school_id', schoolId)
    .maybeSingle()

  if (!inbox) return { ok: false, error: 'Reply not found.' }

  const brand = await loadSchoolBrand(schoolId)
  const tag = subjectTag(brand)
  const parentName = inbox.from_name || inbox.from_email
  const subject = inbox.subject?.startsWith('Re:')
    ? inbox.subject
    : `Re: ${inbox.subject || 'your message'}`

  const html = brandedEmailShell({
    brand,
    eyebrow: 'Reply from the office',
    title: subject,
    bodyHtml: `<p style="white-space:pre-wrap;margin:0 0 16px">${escapeHtml(body)}</p>
      <blockquote style="margin:16px 0;padding:12px 14px;border-left:3px solid #cbd5e1;color:#64748b;font-size:13px">
        <p style="margin:0 0 6px;font-weight:600">You wrote:</p>
        <p style="margin:0;white-space:pre-wrap">${escapeHtml((inbox.body_text || '').slice(0, 2000))}</p>
      </blockquote>`,
    footerNote: brand.email
      ? `This reply was sent from ${brand.name}. You can reply again to continue the conversation in Beacon.`
      : undefined,
  })

  const result = await queueAndSendEmail(
    {
      school_id: schoolId,
      kind: 'message',
      to_email: inbox.from_email,
      to_name: parentName,
      subject: `[${tag}] ${subject}`,
      body_text: `${body}\n\n---\nYou wrote:\n${(inbox.body_text || '').slice(0, 2000)}\n\n${plainFooter(brand)}`,
      body_html: html,
      related_table: 'email_inbox',
      related_id: inbox.id,
      meta: {
        in_reply_to_inbox_id: inbox.id,
        in_reply_to_outbox_id: inbox.outbox_id,
        staff_reply: true,
      },
    },
    { brand }
  )

  if (result.status === 'failed') {
    return { ok: false, error: result.error || 'Send failed.' }
  }

  await access.admin
    .from('email_inbox')
    .update({
      status: 'reviewed',
      reviewed_at: new Date().toISOString(),
      reviewed_by: access.user.id,
      meta: {
        ...((inbox.meta as Record<string, unknown>) || {}),
        staff_replied_outbox_id: result.id,
      },
    })
    .eq('id', inbox.id)
    .eq('school_id', schoolId)

  await access.admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: access.user.id,
    action: 'comms.inbox_reply',
    table_name: 'email_inbox',
    record_id: inbox.id,
    details: { outbox_id: result.id, to: inbox.from_email },
  })

  revalidatePath('/admin/emails')
  revalidatePath('/messages')
  revalidatePath('/desk')
  return {
    ok: true,
    emailed: result.status === 'sent' ? 1 : 0,
    skipped: result.status === 'skipped' ? 1 : 0,
    emailNote:
      result.status === 'skipped'
        ? 'Reply logged only — configure RESEND_API_KEY for live delivery.'
        : 'Reply sent and logged.',
  }
}

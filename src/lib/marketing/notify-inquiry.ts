import { queueAndSendEmail } from '@/lib/email/send'
import { isNtfyConfigured, publishNtfy } from '@/lib/notify/ntfy'
import { resolveFeedbackOwnerEmail } from '@/lib/pilot-feedback/owner'
import { safeReplyTo } from '@/lib/pilot-feedback/notify-owner'
import { createAdminClient } from '@/lib/supabase/admin'

export type SchoolInquiryInput = {
  schoolName: string
  contactName: string
  email: string
  role: string
  message: string
  phone?: string
}

export async function deliverSchoolInquiry(
  input: SchoolInquiryInput
): Promise<{ ok: true; note: string } | { ok: false; error: string }> {
  const to = resolveFeedbackOwnerEmail()
  const admin = createAdminClient()

  // Always audit so leads are never silently lost
  const { data: audit } = await admin
    .from('audit_logs')
    .insert({
      school_id: null,
      user_id: null,
      action: 'marketing.school_inquiry',
      table_name: 'school_inquiry',
      record_id: null,
      details: {
        school_name: input.schoolName,
        contact_name: input.contactName,
        email: input.email,
        role: input.role,
        phone: input.phone || null,
        message: input.message.slice(0, 4000),
      },
    })
    .select('id')
    .maybeSingle()

  if (!to) {
    return {
      ok: true,
      note: 'Received. Configure BEACON_FEEDBACK_TO so new school inquiries email the product owner.',
    }
  }

  const subject = `[Beacon school inquiry] ${input.schoolName.slice(0, 80)}`
  const body_text = [
    'A school wants to talk about Beacon.',
    '',
    `School: ${input.schoolName}`,
    `Contact: ${input.contactName}`,
    `Role: ${input.role}`,
    `Email: ${input.email}`,
    input.phone ? `Phone: ${input.phone}` : null,
    '',
    '——— Message ———',
    input.message,
    '',
    audit?.id ? `Audit id: ${audit.id}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const body_html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#0b1220">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#0369a1;margin:0 0 8px">
        Beacon · school inquiry
      </p>
      <h1 style="font-size:18px;margin:0 0 12px">${escapeHtml(input.schoolName)}</h1>
      <p style="margin:0 0 12px;font-size:14px;color:#475569">
        <strong>${escapeHtml(input.contactName)}</strong> · ${escapeHtml(input.role)}<br/>
        <a href="mailto:${escapeHtml(input.email)}">${escapeHtml(input.email)}</a>
        ${input.phone ? `<br/>${escapeHtml(input.phone)}` : ''}
      </p>
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#f8fafc;white-space:pre-wrap;font-size:14px">
${escapeHtml(input.message)}
      </div>
    </div>
  `

  const result = await queueAndSendEmail({
    school_id: null,
    kind: 'school_inquiry',
    to_email: to,
    to_name: 'Beacon product owner',
    subject,
    body_text,
    body_html,
    reply_to: safeReplyTo(input.email),
    related_table: 'audit_logs',
    related_id: audit?.id ?? null,
    meta: {
      school_name: input.schoolName,
      inquiry_email: input.email,
      role: input.role,
    },
  })

  if (isNtfyConfigured()) {
    await publishNtfy({
      title: 'Beacon · school inquiry',
      message: `${input.schoolName}\n${input.contactName} (${input.role})\n${input.email}\n\n${input.message.slice(0, 400)}`,
      tags: ['school', 'beacon', 'mega'],
      priority: 'high',
      click:
        (process.env.NEXT_PUBLIC_APP_URL?.trim() || 'https://beacon.commoncentsip.com').replace(
          /\/$/,
          ''
        ) + '/about',
    })
  }

  if (result.status === 'failed') {
    return {
      ok: true,
      note: `Saved. Email to owner failed (${result.error || 'unknown'}) — check outbox / BEACON_FEEDBACK_TO.`,
    }
  }

  return {
    ok: true,
    note:
      result.status === 'sent'
        ? 'Thanks — we received your note and will reply by email.'
        : 'Thanks — your note is logged. Owner email is in log-only mode until Resend/SMTP is live.',
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

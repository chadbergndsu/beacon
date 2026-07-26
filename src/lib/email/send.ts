import { createAdminClient } from '@/lib/supabase/admin'
import type { EmailOutboxRow, OutboundEmail } from '@/lib/email/types'

const FROM =
  process.env.EMAIL_FROM || 'Beacon <onboarding@resend.dev>'

/**
 * Queue + attempt send. Always records a row (email_outbox or audit_logs fallback).
 * Uses Resend when RESEND_API_KEY is set; otherwise marks as skipped (logged only).
 */
export async function queueAndSendEmail(
  email: OutboundEmail
): Promise<{ id: string; status: string; error?: string }> {
  const admin = createAdminClient()
  const provider = process.env.RESEND_API_KEY ? 'resend' : 'log'

  let sendResult: { status: 'sent' | 'failed' | 'skipped'; error?: string; provider: string }

  if (process.env.RESEND_API_KEY) {
    sendResult = await sendWithResend(email)
  } else {
    console.info('[beacon-email:queued-log-only]', {
      to: email.to_email,
      subject: email.subject,
      kind: email.kind,
    })
    sendResult = {
      status: 'skipped',
      provider: 'log',
      error: 'RESEND_API_KEY not set — email logged only (not delivered).',
    }
  }

  const row = {
    school_id: email.school_id,
    kind: email.kind,
    to_email: email.to_email,
    to_name: email.to_name ?? null,
    subject: email.subject,
    body_text: email.body_text,
    body_html: email.body_html ?? null,
    status: sendResult.status,
    provider: sendResult.provider || provider,
    error: sendResult.error ?? null,
    related_table: email.related_table ?? null,
    related_id: email.related_id ?? null,
    meta: email.meta ?? {},
    sent_at: sendResult.status === 'sent' ? new Date().toISOString() : null,
  }

  const { data, error } = await admin
    .from('email_outbox')
    .insert(row)
    .select('id, status')
    .maybeSingle()

  if (error) {
    // Table may not exist yet — fall back to audit_logs
    const { data: audit } = await admin
      .from('audit_logs')
      .insert({
        school_id: email.school_id,
        user_id: null,
        action: `email.${sendResult.status}`,
        table_name: 'email_outbox',
        record_id: email.related_id ?? null,
        details: { ...row, fallback: true },
      })
      .select('id')
      .maybeSingle()

    return {
      id: audit?.id ?? 'unknown',
      status: sendResult.status,
      error: sendResult.error || error.message,
    }
  }

  return {
    id: data?.id ?? 'unknown',
    status: data?.status ?? sendResult.status,
    error: sendResult.error,
  }
}

async function sendWithResend(
  email: OutboundEmail
): Promise<{ status: 'sent' | 'failed'; error?: string; provider: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [email.to_email],
        subject: email.subject,
        text: email.body_text,
        html: email.body_html || undefined,
      }),
    })
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      return {
        status: 'failed',
        provider: 'resend',
        error: body?.message || `Resend HTTP ${res.status}`,
      }
    }
    return { status: 'sent', provider: 'resend' }
  } catch (e) {
    return {
      status: 'failed',
      provider: 'resend',
      error: e instanceof Error ? e.message : 'Resend send failed',
    }
  }
}

export async function listEmailOutbox(schoolId: string | null, limit = 50): Promise<EmailOutboxRow[]> {
  const admin = createAdminClient()

  let q = admin
    .from('email_outbox')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (schoolId) q = q.eq('school_id', schoolId)

  const { data, error } = await q
  if (!error && data) {
    return data as EmailOutboxRow[]
  }

  // Fallback: audit_logs
  let aq = admin
    .from('audit_logs')
    .select('*')
    .like('action', 'email.%')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (schoolId) aq = aq.eq('school_id', schoolId)

  const { data: audits } = await aq
  return (audits ?? []).map((a) => {
    const d = (a.details || {}) as Record<string, unknown>
    return {
      id: a.id,
      school_id: a.school_id,
      kind: (d.kind as EmailOutboxRow['kind']) || 'system',
      to_email: String(d.to_email || ''),
      to_name: (d.to_name as string) || null,
      subject: String(d.subject || ''),
      body_text: String(d.body_text || ''),
      body_html: (d.body_html as string) || null,
      status: (String(a.action).replace('email.', '') as EmailOutboxRow['status']) || 'queued',
      provider: (d.provider as string) || null,
      error: (d.error as string) || null,
      related_table: (d.related_table as string) || null,
      related_id: (d.related_id as string) || null,
      meta: (d.meta as Record<string, unknown>) || {},
      created_at: a.created_at,
      sent_at: (d.sent_at as string) || null,
    }
  })
}

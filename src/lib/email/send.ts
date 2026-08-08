import { createAdminClient } from '@/lib/supabase/admin'
import {
  fromDisplayName,
  resolveReplyTo,
} from '@/lib/email/templates'
import {
  deliverWithCascade,
  describeEmailStack,
  isEmailLive as transportIsEmailLive,
} from '@/lib/email/transport'
import type {
  EmailDeliveryStats,
  EmailOutboxRow,
  EmailStatus,
  OutboundEmail,
} from '@/lib/email/types'
import type { SchoolBrand } from '@/lib/school-brand'
import { sanitizeHeaderValue } from '@/lib/security/headers'

const FALLBACK_FROM = 'Beacon <onboarding@resend.dev>'

/** True when from-address is Resend's shared onboarding sender (not production-safe). */
export function isInsecureEmailFrom(from: string): boolean {
  return /onboarding@resend\.dev/i.test(from)
}

function buildFromHeader(brand?: Pick<SchoolBrand, 'name' | 'shortName'> | null): string {
  const raw = process.env.EMAIL_FROM?.trim() || FALLBACK_FROM
  // If EMAIL_FROM is already "Name <email>", keep it; else wrap with school display name
  if (raw.includes('<') && raw.includes('>')) {
    if (!brand) return raw
    // Prefer school display name while keeping the verified address
    const match = raw.match(/<([^>]+)>/)
    const address = match?.[1]?.trim()
    if (address) {
      return `${sanitizeHeaderValue(fromDisplayName(brand), 80)} <${address}>`
    }
    return raw
  }
  if (brand) return `${sanitizeHeaderValue(fromDisplayName(brand), 80)} <${raw}>`
  return `Beacon <${raw}>`
}

/**
 * Queue + attempt send via transport cascade (Resend → SMTP → log).
 * Always records a row (email_outbox or audit_logs fallback).
 */
export async function queueAndSendEmail(
  email: OutboundEmail,
  opts?: { brand?: Pick<SchoolBrand, 'name' | 'shortName' | 'email'> | null }
): Promise<{
  id: string
  status: EmailStatus
  error?: string
  providerId?: string
  provider?: string
  note?: string
  replayed?: boolean
  attemptCompleted?: true
}> {
  const admin = createAdminClient()
  const brand = opts?.brand
  const replyTo = email.reply_to || (brand ? resolveReplyTo(brand) : undefined) || undefined
  const from = buildFromHeader(brand)
  const safeEmail = {
    ...email,
    subject: sanitizeHeaderValue(email.subject, 200),
    to_name: email.to_name ? sanitizeHeaderValue(email.to_name, 80) : email.to_name,
  }

  const queuedRow = {
    school_id: safeEmail.school_id,
    sender_id: safeEmail.sender_id ?? null,
    attempt_key: safeEmail.attempt_key ?? null,
    kind: safeEmail.kind,
    to_email: safeEmail.to_email.trim().toLowerCase(),
    to_name: safeEmail.to_name ?? null,
    subject: safeEmail.subject,
    body_text: safeEmail.body_text,
    body_html: safeEmail.body_html ?? null,
    status: 'queued' as const,
    provider: null,
    error: null,
    related_table: safeEmail.related_table ?? null,
    related_id: safeEmail.related_id ?? null,
    meta: safeEmail.meta ?? {},
    sent_at: null,
  }

  const { data: claim, error: queueError } = await admin
    .from('email_outbox')
    .insert(queuedRow)
    .select('id, status')
    .maybeSingle()

  if (queueError) {
    if (queueError.code === '23505' && safeEmail.school_id && safeEmail.attempt_key) {
      const { data: prior } = await admin
        .from('email_outbox')
        .select('id, status, provider, error, sent_at')
        .eq('school_id', safeEmail.school_id)
        .eq('attempt_key', safeEmail.attempt_key)
        .eq('to_email', queuedRow.to_email)
        .maybeSingle()
      if (prior) {
        return {
          id: prior.id,
          status: prior.status as EmailStatus,
          ...(prior.error ? { error: prior.error } : {}),
          ...(prior.provider ? { provider: prior.provider } : {}),
          replayed: true,
          ...(prior.status !== 'queued' ? { attemptCompleted: true as const } : {}),
          ...(prior.status === 'queued'
            ? { note: 'Delivery is already queued or in progress.' }
            : {}),
        }
      }
    }
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(new Error('Email queue persistence failed'), {
      surface: 'email',
      kind: safeEmail.kind,
      stage: 'queue',
      schoolId: safeEmail.school_id,
      count: 1,
    })
    return { id: 'unknown', status: 'failed', error: 'Unable to queue email delivery.' }
  }

  if (!claim?.id) {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(new Error('Email queue claim missing'), {
      surface: 'email',
      kind: safeEmail.kind,
      stage: 'queue',
      schoolId: safeEmail.school_id,
      count: 1,
    })
    return { id: 'unknown', status: 'failed', error: 'Unable to queue email delivery.' }
  }

  // Production: never send live mail as Resend onboarding@ (spoof/deliverability risk)
  const prod = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  let sendResult
  try {
    if (prod && isInsecureEmailFrom(from)) {
      sendResult = await deliverWithCascade(safeEmail, from, replyTo, {
        forceLogOnly: true,
        forceLogReason:
          'EMAIL_FROM is still onboarding@resend.dev — set a verified domain sender before live mail.',
      })
    } else {
      sendResult = await deliverWithCascade(safeEmail, from, replyTo)
    }
  } catch {
    sendResult = {
      status: 'failed' as const,
      provider: 'none',
      error: 'Email delivery failed.',
      attempts: [],
    }
  }

  const meta = {
    ...(safeEmail.meta ?? {}),
    ...(sendResult.providerId ? { provider_id: sendResult.providerId } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    from,
    transport_attempts: sendResult.attempts,
  }
  const finalRow = {
    status: sendResult.status,
    provider: sendResult.provider,
    error: sendResult.error ?? null,
    meta,
    sent_at: sendResult.status === 'sent' ? new Date().toISOString() : null,
  }
  const { data: finalized, error: updateError } = await admin
    .from('email_outbox')
    .update(finalRow)
    .eq('id', claim.id)
    .select('id, status')
    .maybeSingle()

  if (updateError || !finalized) {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(new Error('Email outbox finalization failed'), {
        surface: 'email',
        kind: safeEmail.kind,
        stage: 'finalize',
        schoolId: safeEmail.school_id,
        count: 1,
      })
    return {
      id: claim.id,
      status: sendResult.status,
      ...(sendResult.status === 'failed' ? { error: 'Email delivery failed.' } : {}),
      providerId: sendResult.providerId,
      provider: sendResult.provider,
      note: 'Delivery completed. Outbox status may be delayed.',
      attemptCompleted: true,
    }
  }

  if (sendResult.status === 'failed') {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(new Error('Email delivery failed'), {
      surface: 'email',
      kind: safeEmail.kind,
      provider: sendResult.provider,
    })
  }

  return {
    id: claim.id,
    status: sendResult.status,
    error: sendResult.status === 'failed' ? 'Email delivery failed.' : undefined,
    providerId: sendResult.providerId,
    provider: sendResult.provider,
    attemptCompleted: true,
  }
}

/**
 * Send many emails sequentially with a tiny pause so Resend rate limits stay happy.
 * Returns aggregate counts — never throws on individual failures.
 */
export async function queueAndSendBatch(
  emails: OutboundEmail[],
  opts?: { brand?: Pick<SchoolBrand, 'name' | 'shortName' | 'email'> | null; delayMs?: number }
): Promise<{ sent: number; failed: number; skipped: number; total: number; note?: string }> {
  let sent = 0
  let failed = 0
  let skipped = 0
  let note: string | undefined
  const delay = opts?.delayMs ?? 80

  for (let i = 0; i < emails.length; i++) {
    const r = await queueAndSendEmail(emails[i], { brand: opts?.brand })
    if (r.status === 'sent') sent++
    else if (r.status === 'failed') failed++
    else if (r.status === 'skipped') {
      skipped++
      if (!note) {
        note =
          'Emails logged only — configure RESEND_API_KEY and/or SMTP_* for live delivery.'
      }
    } else if (r.status === 'queued') {
      skipped++
      if (!note) note = r.note || 'Delivery is already queued or in progress.'
    }
    if (r.note && !note) note = r.note
    if (delay > 0 && i < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return { sent, failed, skipped, total: emails.length, note }
}

export async function listEmailOutbox(
  schoolId: string | null,
  limit = 50,
  filter?: { status?: string; kind?: string; senderId?: string }
): Promise<EmailOutboxRow[]> {
  // Fail closed: never unscoped service-role read across tenants
  if (!schoolId) return []

  const admin = createAdminClient()

  let q = admin
    .from('email_outbox')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (filter?.status) q = q.eq('status', filter.status)
  if (filter?.kind) q = q.eq('kind', filter.kind)
  if (filter?.senderId) q = q.eq('sender_id', filter.senderId)

  const { data, error } = await q
  if (!error && data) {
    return data as EmailOutboxRow[]
  }

  // Legacy audit rows do not carry verified sender ownership. Never expose
  // that school-wide fallback to a sender-scoped teacher request.
  if (filter?.senderId) return []

  // Fallback: audit_logs
  const aq = admin
    .from('audit_logs')
    .select('*')
    .eq('school_id', schoolId)
    .like('action', 'email.%')
    .order('created_at', { ascending: false })
    .limit(limit)

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
      status: (String(a.action).replace('email.', '') as EmailStatus) || 'queued',
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

export async function getEmailDeliveryStats(
  schoolId: string | null,
  filter?: { senderId?: string }
): Promise<EmailDeliveryStats> {
  const emails = await listEmailOutbox(schoolId, 500, filter)
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000
  const stats: EmailDeliveryStats = {
    total: emails.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    queued: 0,
    last24h: 0,
    emailLive: transportIsEmailLive(),
    fromAddress: process.env.EMAIL_FROM || FALLBACK_FROM,
  }
  for (const e of emails) {
    if (e.status === 'sent') stats.sent++
    else if (e.status === 'failed') stats.failed++
    else if (e.status === 'skipped') stats.skipped++
    else stats.queued++
    if (e.created_at && new Date(e.created_at).getTime() >= dayAgo) stats.last24h++
  }
  return stats
}

export function isEmailLive(): boolean {
  return transportIsEmailLive()
}

export { describeEmailStack }

/**
 * Re-attempt a previously failed/skipped outbox row (fresh send + new row).
 */
export async function resendOutboxRow(
  row: EmailOutboxRow,
  brand?: Pick<SchoolBrand, 'name' | 'shortName' | 'email'> | null,
  attemptKey?: string
): Promise<{ id: string; status: EmailStatus; error?: string; attemptCompleted?: true }> {
  return queueAndSendEmail(
    {
      school_id: row.school_id,
      sender_id: row.sender_id ?? null,
      attempt_key: attemptKey ?? null,
      kind: row.kind,
      to_email: row.to_email,
      to_name: row.to_name,
      subject: row.subject,
      body_text: row.body_text,
      body_html: row.body_html,
      reply_to: (row.meta?.reply_to as string) || resolveReplyTo(brand || { email: null }),
      related_table: row.related_table,
      related_id: row.related_id,
      meta: { ...(row.meta || {}), resend_of: row.id },
    },
    { brand }
  )
}

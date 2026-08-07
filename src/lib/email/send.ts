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
import {
  buildInboundReplyTo,
  generateReplyToken,
  isEmailInboundConfigured,
} from '@/lib/email/reply-routing'
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

/**
 * Owner-bound mail (school inquiry, pilot feedback) must keep the human Reply-To.
 * Family/outbound kinds may rewrite Reply-To to inbound capture when configured.
 */
export function shouldRewriteReplyToInbound(
  kind: OutboundEmail['kind']
): boolean {
  return kind !== 'school_inquiry' && kind !== 'pilot_feedback'
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
): Promise<{ id: string; status: EmailStatus; error?: string; providerId?: string; provider?: string }> {
  const admin = createAdminClient()
  const brand = opts?.brand
  const officeReplyTo =
    email.reply_to || (brand ? resolveReplyTo(brand) : undefined) || undefined

  let replyToken: string | null = email.reply_token ?? null
  let replyTo = officeReplyTo
  if (shouldRewriteReplyToInbound(email.kind) && isEmailInboundConfigured()) {
    replyToken = replyToken || generateReplyToken()
    const inbound = buildInboundReplyTo(replyToken)
    if (inbound) replyTo = inbound
  }

  const from = buildFromHeader(brand)
  const safeEmail = {
    ...email,
    subject: sanitizeHeaderValue(email.subject, 200),
    to_name: email.to_name ? sanitizeHeaderValue(email.to_name, 80) : email.to_name,
  }

  // Production: never send live mail as Resend onboarding@ (spoof/deliverability risk)
  const prod = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production'
  let sendResult
  if (prod && isInsecureEmailFrom(from)) {
    sendResult = await deliverWithCascade(safeEmail, from, replyTo, {
      forceLogOnly: true,
      forceLogReason:
        'EMAIL_FROM is still onboarding@resend.dev — set a verified domain sender before live mail.',
    })
  } else {
    sendResult = await deliverWithCascade(safeEmail, from, replyTo)
  }

  const meta = {
    ...(safeEmail.meta ?? {}),
    ...(sendResult.providerId ? { provider_id: sendResult.providerId } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    ...(officeReplyTo ? { office_reply_to: officeReplyTo } : {}),
    ...(replyToken ? { reply_token: replyToken } : {}),
    from,
    transport_attempts: sendResult.attempts,
  }

  const row: Record<string, unknown> = {
    school_id: safeEmail.school_id,
    kind: safeEmail.kind,
    to_email: safeEmail.to_email,
    to_name: safeEmail.to_name ?? null,
    subject: safeEmail.subject,
    body_text: safeEmail.body_text,
    body_html: safeEmail.body_html ?? null,
    status: sendResult.status,
    provider: sendResult.provider,
    error: sendResult.error ?? null,
    related_table: safeEmail.related_table ?? null,
    related_id: safeEmail.related_id ?? null,
    meta,
    sent_at: sendResult.status === 'sent' ? new Date().toISOString() : null,
  }
  // Column added in migration 023 — only write when inbound capture minted a token
  if (replyToken) row.reply_token = replyToken

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

    if (sendResult.status === 'failed') {
      const { reportError } = await import('@/lib/ops/report-error')
      reportError(new Error(sendResult.error || error.message), {
        surface: 'email',
        kind: safeEmail.kind,
        provider: sendResult.provider,
      })
    }

    return {
      id: audit?.id ?? 'unknown',
      status: sendResult.status,
      error: sendResult.error || error.message,
      providerId: sendResult.providerId,
      provider: sendResult.provider,
    }
  }

  if (sendResult.status === 'failed') {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(new Error(sendResult.error || 'email failed'), {
      surface: 'email',
      kind: safeEmail.kind,
      provider: sendResult.provider,
    })
  }

  return {
    id: data?.id ?? 'unknown',
    status: (data?.status as EmailStatus) ?? sendResult.status,
    error: sendResult.error,
    providerId: sendResult.providerId,
    provider: sendResult.provider,
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
    }
    if (delay > 0 && i < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return { sent, failed, skipped, total: emails.length, note }
}

export async function listEmailOutbox(
  schoolId: string | null,
  limit = 50,
  filter?: { status?: string; kind?: string }
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

  const { data, error } = await q
  if (!error && data) {
    return data as EmailOutboxRow[]
  }

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
  schoolId: string | null
): Promise<EmailDeliveryStats> {
  const emails = await listEmailOutbox(schoolId, 500)
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
  brand?: Pick<SchoolBrand, 'name' | 'shortName' | 'email'> | null
): Promise<{ id: string; status: EmailStatus; error?: string }> {
  return queueAndSendEmail(
    {
      school_id: row.school_id,
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

import { createAdminClient } from '@/lib/supabase/admin'
import {
  fromDisplayName,
  resolveReplyTo,
} from '@/lib/email/templates'
import type {
  EmailDeliveryStats,
  EmailOutboxRow,
  EmailStatus,
  OutboundEmail,
} from '@/lib/email/types'
import type { SchoolBrand } from '@/lib/school-brand'

const DEFAULT_FROM = process.env.EMAIL_FROM || 'Beacon <onboarding@resend.dev>'

function buildFromHeader(brand?: Pick<SchoolBrand, 'name' | 'shortName'> | null): string {
  const raw = process.env.EMAIL_FROM?.trim() || DEFAULT_FROM
  // If EMAIL_FROM is already "Name <email>", keep it; else wrap with school display name
  if (raw.includes('<') && raw.includes('>')) {
    if (!brand) return raw
    // Prefer school display name while keeping the verified address
    const match = raw.match(/<([^>]+)>/)
    const address = match?.[1]?.trim()
    if (address) return `${fromDisplayName(brand)} <${address}>`
    return raw
  }
  if (brand) return `${fromDisplayName(brand)} <${raw}>`
  return `Beacon <${raw}>`
}

/**
 * Queue + attempt send. Always records a row (email_outbox or audit_logs fallback).
 * Uses Resend when RESEND_API_KEY is set; otherwise marks as skipped (logged only).
 */
export async function queueAndSendEmail(
  email: OutboundEmail,
  opts?: { brand?: Pick<SchoolBrand, 'name' | 'shortName' | 'email'> | null }
): Promise<{ id: string; status: EmailStatus; error?: string; providerId?: string }> {
  const admin = createAdminClient()
  const provider = process.env.RESEND_API_KEY ? 'resend' : 'log'
  const brand = opts?.brand
  const replyTo = email.reply_to || (brand ? resolveReplyTo(brand) : undefined) || undefined
  const from = buildFromHeader(brand)

  let sendResult: {
    status: EmailStatus
    error?: string
    provider: string
    providerId?: string
  }

  if (process.env.RESEND_API_KEY) {
    sendResult = await sendWithResend(email, from, replyTo)
  } else {
    console.info('[beacon-email:queued-log-only]', {
      to: email.to_email,
      subject: email.subject,
      kind: email.kind,
      replyTo,
    })
    sendResult = {
      status: 'skipped',
      provider: 'log',
      error: 'RESEND_API_KEY not set — email logged only (not delivered).',
    }
  }

  const meta = {
    ...(email.meta ?? {}),
    ...(sendResult.providerId ? { provider_id: sendResult.providerId } : {}),
    ...(replyTo ? { reply_to: replyTo } : {}),
    from,
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
    meta,
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
      providerId: sendResult.providerId,
    }
  }

  return {
    id: data?.id ?? 'unknown',
    status: (data?.status as EmailStatus) ?? sendResult.status,
    error: sendResult.error,
    providerId: sendResult.providerId,
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
      if (!note) note = 'Emails logged only — set RESEND_API_KEY on Vercel for live delivery.'
    }
    if (delay > 0 && i < emails.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  return { sent, failed, skipped, total: emails.length, note }
}

async function sendWithResend(
  email: OutboundEmail,
  from: string,
  replyTo?: string
): Promise<{
  status: 'sent' | 'failed'
  error?: string
  provider: string
  providerId?: string
}> {
  try {
    const payload: Record<string, unknown> = {
      from,
      to: [email.to_email],
      subject: email.subject,
      text: email.body_text,
      html: email.body_html || undefined,
    }
    if (replyTo) payload.reply_to = replyTo

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const body = (await res.json().catch(() => ({}))) as {
      message?: string
      id?: string
    }
    if (!res.ok) {
      return {
        status: 'failed',
        provider: 'resend',
        error: body?.message || `Resend HTTP ${res.status}`,
      }
    }
    return { status: 'sent', provider: 'resend', providerId: body.id }
  } catch (e) {
    return {
      status: 'failed',
      provider: 'resend',
      error: e instanceof Error ? e.message : 'Resend send failed',
    }
  }
}

export async function listEmailOutbox(
  schoolId: string | null,
  limit = 50,
  filter?: { status?: string; kind?: string }
): Promise<EmailOutboxRow[]> {
  const admin = createAdminClient()

  let q = admin
    .from('email_outbox')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (schoolId) q = q.eq('school_id', schoolId)
  if (filter?.status) q = q.eq('status', filter.status)
  if (filter?.kind) q = q.eq('kind', filter.kind)

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
    emailLive: Boolean(process.env.RESEND_API_KEY),
    fromAddress: process.env.EMAIL_FROM || DEFAULT_FROM,
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
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

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

/**
 * Production email transports — cascade, never a single vendor SPOF.
 *
 * Order (override with EMAIL_TRANSPORTS=resend,smtp,log):
 *   1. Resend (if RESEND_API_KEY)
 *   2. SMTP  (if SMTP_HOST + SMTP_USER or SMTP_URL)
 *   3. Log-only (always available)
 */

import nodemailer from 'nodemailer'
import type { OutboundEmail } from './types'

export type TransportName = 'resend' | 'smtp' | 'log'

export type TransportSendResult = {
  status: 'sent' | 'failed' | 'skipped'
  provider: string
  error?: string
  providerId?: string
  /** Full cascade trail for debugging (no secrets). */
  attempts: { provider: string; status: string; error?: string }[]
}

export type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user: string | null
  pass: string | null
  from: string | null
}

export function parseEmailTransports(
  envValue?: string | null,
  opts?: { resendConfigured: boolean; smtpConfigured: boolean }
): TransportName[] {
  const resendConfigured = opts?.resendConfigured ?? Boolean(process.env.RESEND_API_KEY?.trim())
  const smtpConfigured = opts?.smtpConfigured ?? isSmtpConfigured()

  const raw = (envValue ?? process.env.EMAIL_TRANSPORTS ?? '').trim()
  if (raw) {
    const names = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s): s is TransportName => s === 'resend' || s === 'smtp' || s === 'log')
    if (names.length) {
      // Always ensure log is last fallback if not listed
      if (!names.includes('log')) names.push('log')
      return names
    }
  }

  const order: TransportName[] = []
  if (resendConfigured) order.push('resend')
  if (smtpConfigured) order.push('smtp')
  order.push('log')
  return order
}

export function isSmtpConfigured(): boolean {
  if (process.env.SMTP_URL?.trim()) return true
  return Boolean(process.env.SMTP_HOST?.trim())
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim())
}

/** True if any live delivery path is configured (not log-only). */
export function isEmailLive(): boolean {
  return isResendConfigured() || isSmtpConfigured()
}

export function resolveSmtpConfig(): SmtpConfig | null {
  if (!isSmtpConfigured()) return null

  const url = process.env.SMTP_URL?.trim()
  if (url) {
    try {
      const u = new URL(url)
      const port = u.port ? Number(u.port) : u.protocol === 'smtps:' ? 465 : 587
      return {
        host: u.hostname,
        port,
        secure: u.protocol === 'smtps:' || port === 465,
        user: u.username ? decodeURIComponent(u.username) : null,
        pass: u.password ? decodeURIComponent(u.password) : null,
        from: process.env.EMAIL_FROM?.trim() || null,
      }
    } catch {
      // fall through to discrete vars
    }
  }

  const host = process.env.SMTP_HOST?.trim()
  if (!host) return null
  const port = Number(process.env.SMTP_PORT || '587')
  return {
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    user: process.env.SMTP_USER?.trim() || null,
    pass: process.env.SMTP_PASS?.trim() || null,
    from: process.env.EMAIL_FROM?.trim() || null,
  }
}

export function describeEmailStack(): {
  live: boolean
  transports: TransportName[]
  resend: boolean
  smtp: boolean
  detail: string
} {
  const transports = parseEmailTransports()
  const resend = isResendConfigured()
  const smtp = isSmtpConfigured()
  const live = resend || smtp
  const parts: string[] = []
  if (resend) parts.push('Resend')
  if (smtp) parts.push('SMTP')
  if (!live) parts.push('log-only')
  return {
    live,
    transports,
    resend,
    smtp,
    detail: `Order: ${transports.join(' → ')} · ${parts.join(' + ')}`,
  }
}

/**
 * Try transports in order until one sends (or log skips).
 * Failed live transports fall through to the next.
 */
export async function deliverWithCascade(
  email: OutboundEmail,
  from: string,
  replyTo?: string
): Promise<TransportSendResult> {
  const order = parseEmailTransports()
  const attempts: TransportSendResult['attempts'] = []

  for (const name of order) {
    if (name === 'resend') {
      if (!isResendConfigured()) {
        attempts.push({ provider: 'resend', status: 'skipped', error: 'not configured' })
        continue
      }
      const r = await sendWithResend(email, from, replyTo)
      attempts.push({
        provider: 'resend',
        status: r.status,
        error: r.error,
      })
      if (r.status === 'sent') {
        return { ...r, attempts }
      }
      // invalid key / rate limit → try next
      continue
    }

    if (name === 'smtp') {
      if (!isSmtpConfigured()) {
        attempts.push({ provider: 'smtp', status: 'skipped', error: 'not configured' })
        continue
      }
      const r = await sendWithSmtp(email, from, replyTo)
      attempts.push({
        provider: 'smtp',
        status: r.status,
        error: r.error,
      })
      if (r.status === 'sent') {
        return { ...r, attempts }
      }
      continue
    }

    // log
    console.info('[beacon-email:log-only]', {
      to: email.to_email,
      subject: email.subject,
      kind: email.kind,
      priorAttempts: attempts.length,
    })
    attempts.push({
      provider: 'log',
      status: 'skipped',
      error: 'No live transport succeeded — email logged only.',
    })
    return {
      status: 'skipped',
      provider: 'log',
      error:
        attempts
          .filter((a) => a.provider !== 'log' && a.error)
          .map((a) => `${a.provider}: ${a.error}`)
          .join('; ') || 'No live email transport configured.',
      attempts,
    }
  }

  return {
    status: 'skipped',
    provider: 'log',
    error: 'No transports available.',
    attempts,
  }
}

async function sendWithResend(
  email: OutboundEmail,
  from: string,
  replyTo?: string
): Promise<Omit<TransportSendResult, 'attempts'>> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 20_000)
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
      signal: controller.signal,
    })
    clearTimeout(timer)

    const body = (await res.json().catch(() => ({}))) as {
      message?: string
      id?: string
      name?: string
    }
    if (!res.ok) {
      return {
        status: 'failed',
        provider: 'resend',
        error: body?.message || body?.name || `Resend HTTP ${res.status}`,
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

async function sendWithSmtp(
  email: OutboundEmail,
  from: string,
  replyTo?: string
): Promise<Omit<TransportSendResult, 'attempts'>> {
  const cfg = resolveSmtpConfig()
  if (!cfg) {
    return { status: 'failed', provider: 'smtp', error: 'SMTP not configured' }
  }

  try {
    const transport = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: cfg.user
        ? {
            user: cfg.user,
            pass: cfg.pass || '',
          }
        : undefined,
      connectionTimeout: 15_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    })

    const info = await transport.sendMail({
      from: cfg.from || from,
      to: email.to_email,
      subject: email.subject,
      text: email.body_text,
      html: email.body_html || undefined,
      replyTo: replyTo || undefined,
    })

    return {
      status: 'sent',
      provider: 'smtp',
      providerId: info.messageId || undefined,
    }
  } catch (e) {
    return {
      status: 'failed',
      provider: 'smtp',
      error: e instanceof Error ? e.message : 'SMTP send failed',
    }
  }
}

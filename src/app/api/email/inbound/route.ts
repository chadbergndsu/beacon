import { NextResponse } from 'next/server'
import {
  fetchResendReceivedEmail,
  ingestInboundEmail,
  verifyBeaconInboundHmac,
  verifyBearerSecret,
  verifySvixSignature,
} from '@/lib/email/inbound'
import { inboundWebhookSecret, isEmailInboundConfigured } from '@/lib/email/reply-routing'
import type { InboundEmailPayload } from '@/lib/email/types'
import { reportError } from '@/lib/ops/report-error'
import { rateLimitAsync } from '@/lib/security/rate-limit'

export const runtime = 'nodejs'

/**
 * Inbound family email webhook.
 * POST /api/email/inbound
 *
 * Providers:
 * 1. Resend (Svix) — email.received → fetch body via Receiving API
 * 2. Beacon JSON — Authorization: Bearer SECRET or X-Beacon-Inbound-Signature: sha256=…
 *
 * Fail closed without EMAIL_INBOUND_WEBHOOK_SECRET (or RESEND_WEBHOOK_SECRET).
 */
export async function POST(request: Request) {
  if (!isEmailInboundConfigured() && !inboundWebhookSecret()) {
    return NextResponse.json({ error: 'Inbound email not configured' }, { status: 503 })
  }
  const secret = inboundWebhookSecret()
  if (!secret) {
    return NextResponse.json({ error: 'Inbound webhook secret missing' }, { status: 503 })
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  const rl = await rateLimitAsync({
    key: `email-inbound:${ip}`,
    limit: 120,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Rate limited' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    )
  }

  const body = await request.text()
  if (!body || body.length > 512_000) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const svixId = request.headers.get('svix-id')
  const svixTimestamp = request.headers.get('svix-timestamp')
  const svixSignature = request.headers.get('svix-signature')

  let payload: InboundEmailPayload | null = null

  try {
    if (svixId && svixTimestamp && svixSignature) {
      const ok = verifySvixSignature({
        body,
        svixId,
        svixTimestamp,
        svixSignature,
        secret,
      })
      if (!ok) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
      payload = await parseResendEvent(body)
    } else {
      const authOk =
        verifyBearerSecret(request.headers.get('authorization')) ||
        verifyBeaconInboundHmac(body, request.headers.get('x-beacon-inbound-signature'))
      if (!authOk) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      payload = parseBeaconDirect(body)
    }

    if (!payload) {
      return NextResponse.json({ received: true, ignored: true })
    }

    const result = await ingestInboundEmail(payload)
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status || 500 }
      )
    }
    return NextResponse.json({
      received: true,
      id: result.id,
      already: result.already === true,
      unmatched: result.unmatched === true,
    })
  } catch (e) {
    reportError(e, { surface: 'email-inbound-webhook' })
    return NextResponse.json({ error: 'Webhook failed' }, { status: 400 })
  }
}

async function parseResendEvent(body: string): Promise<InboundEmailPayload | null> {
  const event = JSON.parse(body) as {
    type?: string
    data?: {
      email_id?: string
      from?: string
      to?: string[]
      received_for?: string[]
      subject?: string
      message_id?: string
      text?: string
      html?: string
    }
  }

  if (event.type && event.type !== 'email.received') {
    return null
  }

  const data = event.data
  if (!data?.from || !data.to?.length) {
    // Some payloads nest differently — ignore quietly
    if (!event.type) {
      return parseBeaconDirect(body)
    }
    return null
  }

  let text = data.text || ''
  let html = data.html || null
  if (data.email_id && !text && !html) {
    const full = await fetchResendReceivedEmail(data.email_id)
    if (full) {
      text = full.text || ''
      html = full.html
    }
  }

  return {
    from: data.from,
    to: data.to,
    receivedFor: data.received_for,
    subject: data.subject || '(no subject)',
    bodyText: text,
    bodyHtml: html,
    provider: 'resend',
    providerMessageId: data.message_id || data.email_id || null,
    meta: { email_id: data.email_id },
  }
}

function parseBeaconDirect(body: string): InboundEmailPayload | null {
  const data = JSON.parse(body) as Record<string, unknown>
  // Ignore Resend non-received events that arrived without Svix (shouldn't happen)
  if (typeof data.type === 'string' && data.type !== 'email.received' && !data.from) {
    return null
  }
  const from = String(data.from || '')
  const to = data.to
  if (!from || !to) return null
  return {
    from,
    fromName: data.from_name ? String(data.from_name) : null,
    to: Array.isArray(to) ? to.map(String) : String(to),
    receivedFor: Array.isArray(data.received_for)
      ? data.received_for.map(String)
      : undefined,
    subject: String(data.subject || '(no subject)'),
    bodyText: String(data.text || data.body_text || ''),
    bodyHtml: data.html || data.body_html ? String(data.html || data.body_html) : null,
    provider: String(data.provider || 'beacon'),
    providerMessageId: data.message_id ? String(data.message_id) : null,
    replyToken: data.reply_token ? String(data.reply_token) : null,
    schoolId: data.school_id ? String(data.school_id) : null, // ignored by ingest — attribution via token/profile only
  }
}

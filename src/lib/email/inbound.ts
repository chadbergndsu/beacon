import { createHmac, timingSafeEqual } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  buildInboundReplyTo,
  extractDisplayName,
  extractEmailAddress,
  extractReplyTokenFromAddresses,
  inboundWebhookSecret,
} from '@/lib/email/reply-routing'
import { reportError } from '@/lib/ops/report-error'
import type { EmailInboxRow, InboundEmailPayload } from '@/lib/email/types'

const MAX_BODY = 100_000
const MAX_SUBJECT = 500

export type IngestInboundResult =
  | { ok: true; id: string; already?: boolean; unmatched?: boolean }
  | { ok: false; error: string; status?: number }

/**
 * Persist a parent (or family) reply. Correlates via reply+token → email_outbox.
 * Idempotent on (provider, provider_message_id).
 */
export async function ingestInboundEmail(
  input: InboundEmailPayload
): Promise<IngestInboundResult> {
  const fromEmail = extractEmailAddress(input.from)
  if (!fromEmail) return { ok: false, error: 'Invalid from address', status: 400 }

  const toList = Array.isArray(input.to) ? input.to : [input.to]
  const toEmail =
    extractEmailAddress(toList.find((t) => extractEmailAddress(t) || '') || '') ||
    extractEmailAddress(toList[0] || '') ||
    'unknown@inbound'

  const token =
    input.replyToken?.trim().toLowerCase() ||
    extractReplyTokenFromAddresses([
      ...toList,
      ...(input.receivedFor || []),
    ])

  const subject = sanitizeText(input.subject || '(no subject)', MAX_SUBJECT)
  let bodyText = sanitizeText(input.bodyText || '', MAX_BODY)
  const bodyHtml = input.bodyHtml
    ? sanitizeText(input.bodyHtml, MAX_BODY)
    : null
  if (!bodyText && bodyHtml) {
    bodyText = stripHtml(bodyHtml).slice(0, MAX_BODY)
  }
  if (!bodyText) bodyText = '(empty body)'

  const admin = createAdminClient()

  let outboxId: string | null = null
  let schoolId: string | null = input.schoolId || null

  if (token) {
    const { data: outbox } = await admin
      .from('email_outbox')
      .select('id, school_id, to_email, subject, reply_token')
      .eq('reply_token', token)
      .maybeSingle()

    if (outbox?.id) {
      outboxId = outbox.id
      schoolId = outbox.school_id
    }
  }

  if (!schoolId) {
    // Unmatched replies: try parent profile email → school
    const { data: profile } = await admin
      .from('profiles')
      .select('school_id')
      .eq('role', 'parent')
      .ilike('email', fromEmail)
      .not('school_id', 'is', null)
      .limit(1)
      .maybeSingle()
    schoolId = profile?.school_id ?? null
  }

  if (!schoolId) {
    // Still log under null school is not allowed — store via audit only
    await admin.from('audit_logs').insert({
      school_id: null,
      user_id: null,
      action: 'email.inbound_unmatched',
      table_name: 'email_inbox',
      record_id: null,
      details: {
        from_email: fromEmail,
        to_email: toEmail,
        subject,
        reply_token: token,
        provider: input.provider,
        provider_message_id: input.providerMessageId,
      },
    })
    return { ok: true, id: 'unmatched', unmatched: true }
  }

  const provider = input.provider || 'inbound'
  const providerMessageId = input.providerMessageId?.trim() || null

  if (providerMessageId) {
    const { data: existing } = await admin
      .from('email_inbox')
      .select('id')
      .eq('provider', provider)
      .eq('provider_message_id', providerMessageId)
      .maybeSingle()
    if (existing?.id) {
      return { ok: true, id: existing.id, already: true }
    }
  }

  const fromName =
    input.fromName?.trim() || extractDisplayName(input.from) || null

  const row = {
    school_id: schoolId,
    outbox_id: outboxId,
    from_email: fromEmail,
    from_name: fromName,
    to_email: toEmail,
    subject,
    body_text: bodyText,
    body_html: bodyHtml,
    status: 'received' as const,
    provider,
    provider_message_id: providerMessageId,
    reply_token: token,
    meta: {
      ...(input.meta || {}),
      ...(token ? { expected_reply_to: buildInboundReplyTo(token) } : {}),
    },
  }

  const { data, error } = await admin
    .from('email_inbox')
    .insert(row)
    .select('id')
    .maybeSingle()

  if (error) {
    // Unique race → treat as already
    if (providerMessageId && /duplicate|unique/i.test(error.message)) {
      const { data: again } = await admin
        .from('email_inbox')
        .select('id')
        .eq('provider', provider)
        .eq('provider_message_id', providerMessageId)
        .maybeSingle()
      if (again?.id) return { ok: true, id: again.id, already: true }
    }
    reportError(error, { surface: 'email-inbound' })
    return { ok: false, error: 'Failed to store reply', status: 500 }
  }

  await admin.from('audit_logs').insert({
    school_id: schoolId,
    user_id: null,
    action: 'email.inbound_received',
    table_name: 'email_inbox',
    record_id: data?.id ?? null,
    details: {
      outbox_id: outboxId,
      from_email: fromEmail,
      subject,
      reply_token: token,
      provider,
    },
  })

  return { ok: true, id: data?.id ?? 'unknown', unmatched: !outboxId }
}

export async function listEmailInbox(
  schoolId: string | null,
  limit = 50,
  filter?: { status?: string }
): Promise<EmailInboxRow[]> {
  if (!schoolId) return []
  const admin = createAdminClient()
  let q = admin
    .from('email_inbox')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (filter?.status) q = q.eq('status', filter.status)
  const { data, error } = await q
  if (error || !data) return []
  return data as EmailInboxRow[]
}

export async function countUnreadInbox(schoolId: string | null): Promise<number> {
  if (!schoolId) return 0
  const admin = createAdminClient()
  const { count, error } = await admin
    .from('email_inbox')
    .select('id', { count: 'exact', head: true })
    .eq('school_id', schoolId)
    .eq('status', 'received')
  if (error) return 0
  return count ?? 0
}

/** Family thread: outbound to parent email + inbound from parent email. */
export async function listFamilyThreadForEmail(
  schoolId: string,
  parentEmail: string,
  limit = 40
): Promise<
  {
    id: string
    direction: 'out' | 'in'
    subject: string
    body_text: string
    created_at: string
    status: string
    kind?: string
  }[]
> {
  const email = parentEmail.trim().toLowerCase()
  if (!email.includes('@') || !schoolId) return []
  const admin = createAdminClient()

  const [{ data: out }, { data: inn }] = await Promise.all([
    admin
      .from('email_outbox')
      .select('id, subject, body_text, created_at, status, kind')
      .eq('school_id', schoolId)
      .ilike('to_email', email)
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('email_inbox')
      .select('id, subject, body_text, created_at, status')
      .eq('school_id', schoolId)
      .ilike('from_email', email)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const items = [
    ...(out ?? []).map((r) => ({
      id: `out_${r.id}`,
      direction: 'out' as const,
      subject: r.subject,
      body_text: r.body_text,
      created_at: r.created_at,
      status: r.status,
      kind: r.kind as string | undefined,
    })),
    ...(inn ?? []).map((r) => ({
      id: `in_${r.id}`,
      direction: 'in' as const,
      subject: r.subject,
      body_text: r.body_text,
      created_at: r.created_at,
      status: r.status,
    })),
  ]
  items.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
  return items.slice(0, limit)
}

/**
 * Verify Svix-style webhook signature (Resend uses Svix).
 * secret may be `whsec_…` (base64) or raw shared secret.
 */
export function verifySvixSignature(opts: {
  body: string
  svixId: string
  svixTimestamp: string
  svixSignature: string
  secret: string
}): boolean {
  try {
    const secretBytes = parseWebhookSecret(opts.secret)
    const signed = `${opts.svixId}.${opts.svixTimestamp}.${opts.body}`
    const expected = createHmac('sha256', secretBytes).update(signed).digest('base64')

    const signatures = opts.svixSignature.split(' ').map((part) => {
      const [, sig] = part.split(',')
      // formats: "v1,BASE64" space-separated
      if (part.startsWith('v1,')) return part.slice(3)
      return sig || part.replace(/^v1,/, '')
    })

    // Also handle "v1,sig v1,sig2"
    const candidates = opts.svixSignature
      .split(/\s+/)
      .map((p) => (p.includes(',') ? p.split(',')[1] : p))
      .filter(Boolean)

    for (const cand of candidates.length ? candidates : signatures) {
      const a = Buffer.from(expected)
      const b = Buffer.from(cand)
      if (a.length === b.length && timingSafeEqual(a, b)) return true
    }
    return false
  } catch {
    return false
  }
}

/** Simple HMAC of raw body with shared secret (Beacon direct ingest). */
export function verifyBeaconInboundHmac(body: string, signatureHeader: string | null): boolean {
  const secret = inboundWebhookSecret()
  if (!secret || !signatureHeader) return false
  try {
    const expected = createHmac('sha256', secret).update(body).digest('hex')
    const provided = signatureHeader.replace(/^sha256=/i, '').trim()
    const a = Buffer.from(expected)
    const b = Buffer.from(provided)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export function verifyBearerSecret(authHeader: string | null): boolean {
  const secret = inboundWebhookSecret()
  if (!secret || !authHeader) return false
  const m = authHeader.match(/^Bearer\s+(.+)$/i)
  if (!m?.[1]) return false
  try {
    const a = Buffer.from(m[1].trim())
    const b = Buffer.from(secret)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

function parseWebhookSecret(secret: string): Buffer {
  if (secret.startsWith('whsec_')) {
    return Buffer.from(secret.slice(6), 'base64')
  }
  return Buffer.from(secret, 'utf8')
}

function sanitizeText(s: string, max: number): string {
  return s.replace(/\0/g, '').slice(0, max)
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Fetch Resend received email body when webhook only has metadata. */
export async function fetchResendReceivedEmail(emailId: string): Promise<{
  text: string | null
  html: string | null
  headers?: Record<string, string>
} | null> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key || !emailId) return null
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    if (!res.ok) return null
    const body = (await res.json()) as {
      text?: string | null
      html?: string | null
      headers?: Record<string, string>
    }
    return {
      text: body.text ?? null,
      html: body.html ?? null,
      headers: body.headers,
    }
  } catch (e) {
    reportError(e, { surface: 'email-inbound-resend-fetch' })
    return null
  }
}

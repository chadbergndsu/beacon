import { randomBytes } from 'node:crypto'

/** Plus-address local-part for inbound replies: reply+{token}@domain */
const REPLY_LOCAL_PREFIX = 'reply+'

export function isEmailInboundConfigured(): boolean {
  return Boolean(inboundDomain() && inboundWebhookSecret())
}

export function inboundDomain(): string | null {
  const raw =
    process.env.EMAIL_INBOUND_DOMAIN?.trim() ||
    extractDomain(process.env.EMAIL_INBOUND_ADDRESS?.trim())
  if (!raw) return null
  const domain = raw.replace(/^@/, '').toLowerCase()
  if (!domain.includes('.') || domain.length < 4 || domain.length > 253) return null
  if (!/^[a-z0-9.-]+$/i.test(domain)) return null
  return domain
}

export function inboundWebhookSecret(): string | null {
  const s =
    process.env.EMAIL_INBOUND_WEBHOOK_SECRET?.trim() ||
    process.env.RESEND_WEBHOOK_SECRET?.trim()
  return s && s.length >= 16 ? s : null
}

/** CSPRNG reply correlation token (hex). */
export function generateReplyToken(): string {
  return randomBytes(18).toString('hex')
}

export function buildInboundReplyTo(token: string): string | null {
  const domain = inboundDomain()
  if (!domain) return null
  const t = token.trim().toLowerCase()
  if (!/^[a-f0-9]{20,64}$/.test(t)) return null
  return `${REPLY_LOCAL_PREFIX}${t}@${domain}`
}

/**
 * Extract reply token from To / received_for addresses.
 * Accepts reply+TOKEN@domain and bare TOKEN@ when local-part is hex.
 */
export function extractReplyTokenFromAddresses(
  addresses: string | string[] | null | undefined
): string | null {
  const list = Array.isArray(addresses) ? addresses : addresses ? [addresses] : []
  for (const raw of list) {
    const email = extractEmailAddress(raw)
    if (!email) continue
    const local = email.split('@')[0]?.toLowerCase() || ''
    if (local.startsWith(REPLY_LOCAL_PREFIX)) {
      const token = local.slice(REPLY_LOCAL_PREFIX.length)
      if (/^[a-f0-9]{20,64}$/.test(token)) return token
    }
    // Also accept bare hex local-part (some forwarders strip plus)
    if (/^[a-f0-9]{20,64}$/.test(local)) return local
  }
  return null
}

export function extractEmailAddress(raw: string): string | null {
  const s = raw.trim()
  if (!s) return null
  const angle = s.match(/<([^>]+)>/)
  const addr = (angle?.[1] || s).trim().toLowerCase()
  if (!addr.includes('@') || addr.length > 320) return null
  return addr
}

export function extractDisplayName(raw: string): string | null {
  const s = raw.trim()
  if (!s.includes('<')) return null
  const name = s.replace(/<[^>]+>/, '').trim().replace(/^["']|["']$/g, '')
  return name || null
}

function extractDomain(addr: string | undefined): string | null {
  if (!addr) return null
  const email = extractEmailAddress(addr)
  if (!email) return null
  return email.split('@')[1] || null
}

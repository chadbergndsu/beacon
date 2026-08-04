import { createHmac, timingSafeEqual } from 'node:crypto'

export type OAuthStatePayload = {
  schoolId: string
  userId: string
  ts: number
  nonce: string
}

const MAX_AGE_MS = 10 * 60 * 1000 // 10 minutes

function secret(): string {
  return (
    process.env.BEACON_OAUTH_STATE_SECRET?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    'beacon-dev-oauth-state'
  )
}

function b64url(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf
  return b.toString('base64url')
}

function sign(body: string): string {
  return createHmac('sha256', secret()).update(body).digest('base64url')
}

/** HMAC-signed OAuth state (CSRF + expiry). */
export function signOAuthState(input: {
  schoolId: string
  userId: string
}): string {
  const payload: OAuthStatePayload = {
    schoolId: input.schoolId,
    userId: input.userId,
    ts: Date.now(),
    nonce: b64url(Buffer.from(crypto.getRandomValues(new Uint8Array(12)))),
  }
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

export function verifyOAuthState(
  state: string
): { ok: true; payload: OAuthStatePayload } | { ok: false; error: string } {
  const parts = state.split('.')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, error: 'Invalid OAuth state.' }
  }
  const [body, sig] = parts
  const expected = sign(body)
  try {
    const a = Buffer.from(sig)
    const b = Buffer.from(expected)
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { ok: false, error: 'Invalid OAuth state signature.' }
    }
  } catch {
    return { ok: false, error: 'Invalid OAuth state signature.' }
  }
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as OAuthStatePayload
    if (!payload.schoolId || !payload.userId || !payload.ts) {
      return { ok: false, error: 'Invalid OAuth state payload.' }
    }
    if (Date.now() - payload.ts > MAX_AGE_MS) {
      return { ok: false, error: 'OAuth state expired. Try Connect again.' }
    }
    return { ok: true, payload }
  } catch {
    return { ok: false, error: 'Invalid OAuth state payload.' }
  }
}

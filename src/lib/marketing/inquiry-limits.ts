import { createHash } from 'node:crypto'

const WINDOW_MS = 60 * 60 * 1000

type HeaderSource = Pick<Headers, 'get'>

export type InquiryRateLimit = {
  key: string
  limit: number
  windowMs: number
}

export async function consumeEphemeralInquiryLimits(
  limits: InquiryRateLimit[],
  consume: (limit: InquiryRateLimit) => Promise<{ ok: boolean }>
): Promise<boolean> {
  const [globalLimit, ...narrowLimits] = limits

  // Check identity-specific ceilings first. A request already rejected for one
  // identity must not spend the shared global allowance for legitimate schools.
  for (const limit of narrowLimits) {
    if (!(await consume(limit)).ok) return false
  }

  return globalLimit ? (await consume(globalLimit)).ok : false
}

function shortHash(value: string): string {
  return createHash('sha256').update(value).digest('hex').slice(0, 32)
}

function lastForwardedAddress(value: string | null): string | null {
  const candidate = value
    ?.split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1)
  return candidate?.slice(0, 120) || null
}

/** Prefer infrastructure-provided headers and never trust the first XFF hop. */
export function resolveTrustedClientIp(source: HeaderSource): string {
  return (
    lastForwardedAddress(source.get('x-vercel-forwarded-for')) ||
    lastForwardedAddress(source.get('x-real-ip')) ||
    lastForwardedAddress(source.get('x-forwarded-for')) ||
    'unknown'
  )
}

export function buildInquiryRateLimits(input: {
  ip: string
  email: string
}): InquiryRateLimit[] {
  const ipHash = shortHash(input.ip)
  const emailHash = shortHash(input.email.trim().toLowerCase())
  return [
    { key: 'design-partner:global', limit: 40, windowMs: WINDOW_MS },
    {
      key: `design-partner:identity:${shortHash(`${ipHash}:${emailHash}`)}`,
      limit: 3,
      windowMs: WINDOW_MS,
    },
    { key: `design-partner:email:${emailHash}`, limit: 3, windowMs: WINDOW_MS },
    { key: `design-partner:ip:${ipHash}`, limit: 5, windowMs: WINDOW_MS },
  ]
}

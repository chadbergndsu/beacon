/**
 * Rate limiter: in-memory (always available) + Upstash Redis when configured.
 *
 * Production / Vercel preview should set UPSTASH_REDIS_REST_URL + TOKEN so limits
 * hold across serverless instances. Break-glass: RATE_LIMIT_ALLOW_MEMORY=1.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function isProductionLike(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview'
  )
}

export function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  )
}

/** true when multi-instance durable limits are available (or memory break-glass). */
export function durableRateLimitOk(): boolean {
  if (isUpstashConfigured()) return true
  if (!isProductionLike()) return true
  return process.env.RATE_LIMIT_ALLOW_MEMORY === '1'
}

function memoryRateLimit(opts: {
  key: string
  limit: number
  windowMs: number
}): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now()
  const existing = buckets.get(opts.key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs })
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) {
        if (v.resetAt <= now) buckets.delete(k)
      }
    }
    return { ok: true }
  }
  if (existing.count >= opts.limit) {
    return { ok: false, retryAfterMs: Math.max(0, existing.resetAt - now) }
  }
  existing.count += 1
  return { ok: true }
}

async function upstashRateLimit(opts: {
  key: string
  limit: number
  windowMs: number
}): Promise<{ ok: true } | { ok: false; retryAfterMs: number } | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) return null

  const redisKey = `beacon:rl:${opts.key}`
  const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000))
  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['EXPIRE', redisKey, windowSec, 'NX'],
        ['TTL', redisKey],
      ]),
    })
    if (!res.ok) return null
    const data = (await res.json()) as { result?: unknown }[]
    const count = Number(data?.[0]?.result ?? 0)
    const ttl = Number(data?.[2]?.result ?? windowSec)
    if (count > opts.limit) {
      return {
        ok: false,
        retryAfterMs: Math.max(0, (ttl > 0 ? ttl : windowSec) * 1000),
      }
    }
    return { ok: true }
  } catch {
    return null
  }
}

/** Sync API kept for existing call sites; uses memory only. */
export function rateLimit(opts: {
  key: string
  limit: number
  windowMs: number
}): { ok: true } | { ok: false; retryAfterMs: number } {
  return memoryRateLimit(opts)
}

/** Prefer Upstash when configured; fall back to memory. */
export async function rateLimitAsync(opts: {
  key: string
  limit: number
  windowMs: number
}): Promise<{ ok: true } | { ok: false; retryAfterMs: number }> {
  const remote = await upstashRateLimit(opts)
  if (remote) return remote
  return memoryRateLimit(opts)
}

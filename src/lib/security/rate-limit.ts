/**
 * Best-effort in-memory rate limiter for serverless.
 * Not perfect across instances; still stops casual abuse per isolate.
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export function rateLimit(opts: {
  key: string
  limit: number
  windowMs: number
}): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now()
  const existing = buckets.get(opts.key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs })
    // opportunistic prune
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

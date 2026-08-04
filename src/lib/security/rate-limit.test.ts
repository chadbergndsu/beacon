import { afterEach, describe, expect, it } from 'vitest'
import {
  durableRateLimitOk,
  isProductionLike,
  isUpstashConfigured,
  rateLimit,
} from './rate-limit'

describe('rateLimit', () => {
  afterEach(() => {
    delete process.env.UPSTASH_REDIS_REST_URL
    delete process.env.UPSTASH_REDIS_REST_TOKEN
    delete process.env.RATE_LIMIT_ALLOW_MEMORY
    delete process.env.VERCEL_ENV
  })

  it('allows under limit and blocks over', () => {
    const key = `test-${Date.now()}-${Math.random()}`
    expect(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true)
    expect(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true)
    const blocked = rateLimit({ key, limit: 2, windowMs: 60_000 })
    expect(blocked.ok).toBe(false)
    if (!blocked.ok) {
      expect(blocked.retryAfterMs).toBeGreaterThan(0)
      expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000)
    }
  })

  it('isolates keys', () => {
    const a = `a-${Date.now()}-${Math.random()}`
    const b = `b-${Date.now()}-${Math.random()}`
    expect(rateLimit({ key: a, limit: 1, windowMs: 60_000 }).ok).toBe(true)
    expect(rateLimit({ key: a, limit: 1, windowMs: 60_000 }).ok).toBe(false)
    expect(rateLimit({ key: b, limit: 1, windowMs: 60_000 }).ok).toBe(true)
  })

  it('durableRateLimitOk requires Upstash (or break-glass) in production-like envs', () => {
    process.env.VERCEL_ENV = 'production'
    expect(isProductionLike()).toBe(true)
    expect(isUpstashConfigured()).toBe(false)
    expect(durableRateLimitOk()).toBe(false)
    process.env.RATE_LIMIT_ALLOW_MEMORY = '1'
    expect(durableRateLimitOk()).toBe(true)
    delete process.env.RATE_LIMIT_ALLOW_MEMORY
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io'
    process.env.UPSTASH_REDIS_REST_TOKEN = 'tok'
    expect(isUpstashConfigured()).toBe(true)
    expect(durableRateLimitOk()).toBe(true)
  })
})

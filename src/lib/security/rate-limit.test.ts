import { describe, expect, it } from 'vitest'
import { rateLimit } from './rate-limit'

describe('rateLimit', () => {
  it('allows under limit and blocks over', () => {
    const key = `test-${Date.now()}-${Math.random()}`
    expect(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true)
    expect(rateLimit({ key, limit: 2, windowMs: 60_000 }).ok).toBe(true)
    const blocked = rateLimit({ key, limit: 2, windowMs: 60_000 })
    expect(blocked.ok).toBe(false)
  })
})

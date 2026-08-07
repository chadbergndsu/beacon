import { describe, expect, it } from 'vitest'
import {
  buildInquiryRateLimits,
  consumeEphemeralInquiryLimits,
  resolveTrustedClientIp,
} from './inquiry-limits'

function headerSource(values: Record<string, string>) {
  return { get: (name: string) => values[name] ?? null }
}

describe('public inquiry abuse boundaries', () => {
  it('keeps the IP and global ceilings stable when an attacker rotates email addresses', () => {
    const first = buildInquiryRateLimits({ ip: '203.0.113.9', email: 'one@example.com' })
    const second = buildInquiryRateLimits({ ip: '203.0.113.9', email: 'two@example.com' })

    expect(second[0]).toEqual(first[0])
    expect(second[3]).toEqual(first[3])
    expect(second[2].key).not.toBe(first[2].key)
    expect(second[1].key).not.toBe(first[1].key)
  })

  it('keeps the email and global ceilings stable across different client addresses', () => {
    const first = buildInquiryRateLimits({ ip: '203.0.113.9', email: 'Owner@Example.com' })
    const second = buildInquiryRateLimits({ ip: '203.0.113.10', email: 'owner@example.com' })

    expect(second[0]).toEqual(first[0])
    expect(second[2]).toEqual(first[2])
    expect(second[3].key).not.toBe(first[3].key)
  })

  it('uses the infrastructure-appended end of a forwarded chain', () => {
    expect(
      resolveTrustedClientIp(
        headerSource({ 'x-forwarded-for': '198.51.100.200, 203.0.113.9' })
      )
    ).toBe('203.0.113.9')
  })

  it('prefers Vercel forwarding metadata over a generic forwarded header', () => {
    expect(
      resolveTrustedClientIp(
        headerSource({
          'x-vercel-forwarded-for': '203.0.113.12',
          'x-forwarded-for': '198.51.100.200',
        })
      )
    ).toBe('203.0.113.12')
  })

  it('does not consume the shared global bucket after a narrower denial', async () => {
    const limits = buildInquiryRateLimits({ ip: '203.0.113.9', email: 'one@example.com' })
    const consumed: string[] = []
    const allowed = await consumeEphemeralInquiryLimits(limits, async (limit) => {
      consumed.push(limit.key)
      return { ok: !limit.key.includes(':email:') }
    })

    expect(allowed).toBe(false)
    expect(consumed).toEqual([limits[1].key, limits[2].key])
    expect(consumed).not.toContain('design-partner:global')
    expect(consumed).not.toContain(limits[3].key)
  })

  it('consumes the shared global bucket last for an accepted request', async () => {
    const limits = buildInquiryRateLimits({ ip: '203.0.113.9', email: 'one@example.com' })
    const consumed: string[] = []
    const allowed = await consumeEphemeralInquiryLimits(limits, async (limit) => {
      consumed.push(limit.key)
      return { ok: true }
    })

    expect(allowed).toBe(true)
    expect(consumed.at(-1)).toBe('design-partner:global')
  })
})

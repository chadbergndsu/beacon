import { afterEach, describe, expect, it } from 'vitest'
import {
  getAccessTokenTtlDays,
  isAccessTokenExpired,
  nextAccessTokenExpiryIso,
} from './access-tokens'

describe('access token TTL', () => {
  afterEach(() => {
    delete process.env.BEACON_ACCESS_TOKEN_TTL_DAYS
  })

  it('defaults to 90 days', () => {
    expect(getAccessTokenTtlDays()).toBe(90)
  })

  it('reads env with floor and cap', () => {
    process.env.BEACON_ACCESS_TOKEN_TTL_DAYS = '30'
    expect(getAccessTokenTtlDays()).toBe(30)
    process.env.BEACON_ACCESS_TOKEN_TTL_DAYS = '0'
    expect(getAccessTokenTtlDays()).toBe(90)
    process.env.BEACON_ACCESS_TOKEN_TTL_DAYS = '99999'
    expect(getAccessTokenTtlDays()).toBe(3650)
  })

  it('next expiry is ~ttl ahead', () => {
    process.env.BEACON_ACCESS_TOKEN_TTL_DAYS = '10'
    const now = Date.parse('2026-01-01T00:00:00.000Z')
    const iso = nextAccessTokenExpiryIso(now)
    expect(Date.parse(iso)).toBe(now + 10 * 86_400_000)
  })

  it('expired when past or missing', () => {
    const now = Date.parse('2026-06-01T00:00:00.000Z')
    expect(isAccessTokenExpired(null, now)).toBe(true)
    expect(isAccessTokenExpired('', now)).toBe(true)
    expect(isAccessTokenExpired('2026-05-01T00:00:00.000Z', now)).toBe(true)
    expect(isAccessTokenExpired('2026-07-01T00:00:00.000Z', now)).toBe(false)
  })
})

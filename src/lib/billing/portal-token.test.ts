import { describe, expect, it } from 'vitest'
import { familyPayUrl, newPortalToken } from './portal-token'

describe('portal token', () => {
  it('generates unique high-entropy tokens', () => {
    const a = newPortalToken()
    const b = newPortalToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(20)
    expect(a).not.toMatch(/[+/=]/)
  })

  it('builds pay path under app origin', () => {
    const url = familyPayUrl('tok_abc')
    expect(url).toContain('/pay/tok_abc')
  })
})

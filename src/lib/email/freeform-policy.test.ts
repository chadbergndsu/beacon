import { describe, expect, it } from 'vitest'
import { freeformEmailAllowed } from './freeform-policy'

describe('freeformEmailAllowed', () => {
  const school = ['principal@lca.org', 'office@lca.org', 'teacher@partner.edu']

  it('allows exact school profile emails (case-insensitive)', () => {
    expect(freeformEmailAllowed('Principal@LCA.org', school)).toEqual({ ok: true })
  })

  it('allows same domain as school members', () => {
    expect(freeformEmailAllowed('newparent@lca.org', school)).toEqual({ ok: true })
    expect(freeformEmailAllowed('x@partner.edu', school)).toEqual({ ok: true })
  })

  it('blocks unrelated domains', () => {
    const r = freeformEmailAllowed('spam@evil.com', school)
    expect(r.ok).toBe(false)
  })

  it('rejects invalid addresses', () => {
    expect(freeformEmailAllowed('not-an-email', school).ok).toBe(false)
    expect(freeformEmailAllowed('', school).ok).toBe(false)
  })

  it('blocks when school has no emails to derive domain from', () => {
    expect(freeformEmailAllowed('a@b.com', []).ok).toBe(false)
  })
})

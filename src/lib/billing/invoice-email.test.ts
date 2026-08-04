import { describe, expect, it } from 'vitest'
import { familyPayUrl } from '@/lib/billing/portal-token'

describe('parent billing helpers', () => {
  it('pay urls are absolute portal paths', () => {
    const u = familyPayUrl('abc123token')
    expect(u).toContain('/pay/abc123token')
  })
})

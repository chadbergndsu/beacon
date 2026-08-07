import { describe, expect, it } from 'vitest'
import { officeShellMeta } from './office-shell'

describe('officeShellMeta', () => {
  it('uses school office copy for admin', () => {
    const meta = officeShellMeta({ role: 'admin', full_name: 'Marian Gordon' })
    expect(meta.kicker).toBe('School office')
    expect(meta.title).toContain('Marian')
    expect(meta.showLeadershipQuote).toBe(false)
  })

  it('keeps principal office copy and leadership quote', () => {
    const meta = officeShellMeta({ role: 'principal', full_name: 'Chris Cowan' })
    expect(meta.kicker).toBe('Principal office')
    expect(meta.title).toContain('Chris')
    expect(meta.showLeadershipQuote).toBe(true)
  })
})

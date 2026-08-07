import { describe, expect, it } from 'vitest'
import { validateSchoolInquiry } from './school-inquiry'

describe('validateSchoolInquiry', () => {
  const base = {
    schoolName: 'Lighthouse Academy',
    contactName: 'Chris Cowan',
    email: 'chris@lighthouse.org',
    role: 'Principal',
    message: 'We are on FACTS and want a calmer family layer.',
  }

  it('accepts a solid inquiry', () => {
    const r = validateSchoolInquiry(base)
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.data.email).toBe('chris@lighthouse.org')
  })

  it('flags honeypot without revealing validation', () => {
    const r = validateSchoolInquiry({ ...base, company: 'Acme Bot Co' })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.honeypot).toBe(true)
  })

  it('rejects short messages and bad email', () => {
    expect(validateSchoolInquiry({ ...base, message: 'Hi' }).ok).toBe(false)
    expect(validateSchoolInquiry({ ...base, email: 'not-an-email' }).ok).toBe(false)
  })
})

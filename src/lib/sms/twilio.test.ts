import { describe, expect, it } from 'vitest'
import { normalizePhone } from './twilio'

describe('normalizePhone', () => {
  it('handles US formats', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('+15551234567')
    expect(normalizePhone('555-123-4567')).toBe('+15551234567')
    expect(normalizePhone('1-555-123-4567')).toBe('+15551234567')
    expect(normalizePhone('+1 555 123 4567')).toBe('+15551234567')
  })

  it('rejects junk', () => {
    expect(normalizePhone('')).toBeNull()
    expect(normalizePhone('123')).toBeNull()
    expect(normalizePhone(null)).toBeNull()
  })
})

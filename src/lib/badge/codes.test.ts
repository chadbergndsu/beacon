import { describe, expect, it } from 'vitest'
import {
  badgePayload,
  computeAftercareAmountCents,
  generateBadgeCode,
  parseScannerInput,
} from './codes'

describe('badge codes', () => {
  it('generates stable length codes', () => {
    const c = generateBadgeCode(6)
    expect(c).toHaveLength(6)
    expect(c).toMatch(/^[A-Z0-9]+$/)
  })

  it('parses scanner payloads', () => {
    expect(parseScannerInput('  ab12cd  ')).toBe('AB12CD')
    expect(parseScannerInput('BEACON|lca|XY99ZZ')).toBe('XY99ZZ')
    expect(parseScannerInput('https://beacon.example/kiosk?code=hello1')).toBe('HELLO1')
  })

  it('parses RFID hex with separators', () => {
    expect(parseScannerInput('a1:b2:c3:d4')).toBe('A1B2C3D4')
    expect(parseScannerInput('04 1A 2B 3C 4D')).toBe('041A2B3C4D')
    expect(parseScannerInput('https://beacon.example/x?rfid=deadbeef')).toBe('DEADBEEF')
  })

  it('bills aftercare in 15-min blocks', () => {
    // $10/hr = 1000 cents, 20 min → 30 min billable → 500 cents
    expect(computeAftercareAmountCents(20, 1000)).toBe(500)
    expect(computeAftercareAmountCents(5, 1000)).toBe(250) // min 15 min
    expect(computeAftercareAmountCents(0, 1000)).toBe(0)
    expect(computeAftercareAmountCents(30, 0)).toBe(0)
    expect(computeAftercareAmountCents(-5, 1000)).toBe(0)
    // exact 15 min
    expect(computeAftercareAmountCents(15, 1200)).toBe(300)
    // 16 min → 30 min block
    expect(computeAftercareAmountCents(16, 1200)).toBe(600)
  })

  it('payload format', () => {
    expect(badgePayload('lca', 'ABC123')).toBe('BEACON|lca|ABC123')
  })

  it('truncates extremely long scanner input', () => {
    const long = 'A'.repeat(100)
    expect(parseScannerInput(long).length).toBeLessThanOrEqual(40)
  })

  it('strips non-alphanumeric noise', () => {
    expect(parseScannerInput('ab-12_cd!')).toBe('AB12CD')
  })
})

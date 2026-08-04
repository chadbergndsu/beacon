import { describe, expect, it } from 'vitest'
import { publicKioskScanCode, staffScanIdentity } from './scan-guards'

describe('publicKioskScanCode', () => {
  it('rejects empty and short codes', () => {
    expect(publicKioskScanCode('')).toMatchObject({ ok: false })
    expect(publicKioskScanCode('AB')).toMatchObject({ ok: false })
    expect(publicKioskScanCode('   ')).toMatchObject({ ok: false })
  })

  it('accepts badge and RFID shapes', () => {
    const badge = publicKioskScanCode('ab12cd')
    expect(badge).toEqual({ ok: true, code: 'AB12CD' })
    const rfid = publicKioskScanCode('a1:b2:c3:d4')
    expect(rfid).toEqual({ ok: true, code: 'A1B2C3D4' })
  })

  it('accepts BEACON payload and URL query', () => {
    expect(publicKioskScanCode('BEACON|lca|XY99ZZ')).toEqual({ ok: true, code: 'XY99ZZ' })
    expect(publicKioskScanCode('https://x.test/k?code=hello1')).toEqual({
      ok: true,
      code: 'HELLO1',
    })
  })
})

describe('staffScanIdentity', () => {
  it('requires badge or studentId', () => {
    expect(staffScanIdentity({})).toMatchObject({ ok: false })
    expect(staffScanIdentity({ rawCode: '', studentId: '' })).toMatchObject({ ok: false })
  })

  it('allows studentId name-tap without code', () => {
    expect(staffScanIdentity({ studentId: 'uuid-1' })).toEqual({ ok: true })
  })

  it('allows valid raw code', () => {
    expect(staffScanIdentity({ rawCode: 'ABCD12' })).toEqual({ ok: true })
  })

  it('rejects too-short raw code when provided', () => {
    expect(staffScanIdentity({ rawCode: 'AB' })).toMatchObject({ ok: false })
  })
})

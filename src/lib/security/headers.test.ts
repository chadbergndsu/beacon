import { describe, expect, it } from 'vitest'
import { sanitizeHeaderValue } from './headers'

describe('sanitizeHeaderValue', () => {
  it('strips CR/LF', () => {
    expect(sanitizeHeaderValue('Hello\r\nBcc: evil@x.com')).toBe('Hello Bcc: evil@x.com')
  })

  it('strips null and escape control chars', () => {
    expect(sanitizeHeaderValue('Hi\0there\x1b')).toBe('Hi there')
  })

  it('collapses whitespace and respects max length', () => {
    expect(sanitizeHeaderValue('a   b\t\tc', 10)).toBe('a b c')
    expect(sanitizeHeaderValue('x'.repeat(50), 10)).toHaveLength(10)
  })
})

import { describe, expect, it } from 'vitest'
import { sanitizeHeaderValue } from './headers'

describe('sanitizeHeaderValue', () => {
  it('strips CR/LF', () => {
    expect(sanitizeHeaderValue('Hello\r\nBcc: evil@x.com')).toBe('Hello Bcc: evil@x.com')
  })
})

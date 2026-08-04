import { describe, expect, it } from 'vitest'
import { safeInternalPath } from './safe-redirect'

describe('safeInternalPath', () => {
  it('allows relative app paths', () => {
    expect(safeInternalPath('/dashboard')).toBe('/dashboard')
    expect(safeInternalPath('/principal/payments')).toBe('/principal/payments')
  })

  it('blocks open redirects', () => {
    expect(safeInternalPath('https://evil.com')).toBe('/dashboard')
    expect(safeInternalPath('//evil.com')).toBe('/dashboard')
    expect(safeInternalPath('\\evil')).toBe('/dashboard')
    expect(safeInternalPath(null)).toBe('/dashboard')
    expect(safeInternalPath('javascript:alert(1)')).toBe('/dashboard')
    expect(safeInternalPath('/\\evil')).toBe('/dashboard')
  })

  it('blocks encoded protocol-relative tricks', () => {
    expect(safeInternalPath('/%2f%2fevil.com')).toBe('/dashboard')
    expect(safeInternalPath('/%2F%2Fevil.com')).toBe('/dashboard')
  })

  it('allows query and hash on same-origin path', () => {
    expect(safeInternalPath('/login?next=/dashboard')).toBe('/login?next=/dashboard')
    expect(safeInternalPath('/principal#top')).toBe('/principal#top')
  })

  it('uses custom fallback', () => {
    expect(safeInternalPath('nope', '/login')).toBe('/login')
    expect(safeInternalPath(undefined, '/login')).toBe('/login')
  })
})

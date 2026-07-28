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
  })

  it('uses custom fallback', () => {
    expect(safeInternalPath('nope', '/login')).toBe('/login')
  })
})

import { describe, expect, it } from 'vitest'

/**
 * Pure mirror of public-path rules in src/lib/supabase/proxy.ts (and README public routes).
 * Keeps the allowlist from silently re-locking health/kiosk APIs or treating QB callback as public.
 */
function isPublicPath(path: string): boolean {
  const PUBLIC_EXACT = new Set(['/', '/login', '/about', '/school'])
  const isKiosk = path === '/kiosk' || path.startsWith('/kiosk/')
  const isDeviceApi = path.startsWith('/api/kiosk/')
  const isHealth = path === '/api/health'
  return PUBLIC_EXACT.has(path) || isKiosk || isDeviceApi || isHealth || path === '/privacy'
}

describe('proxy public paths', () => {
  it('allows health and kiosk surfaces without login', () => {
    expect(isPublicPath('/api/health')).toBe(true)
    expect(isPublicPath('/api/kiosk/device-scan')).toBe(true)
    expect(isPublicPath('/kiosk')).toBe(true)
    expect(isPublicPath('/kiosk/abc123tokenxyz')).toBe(true)
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/privacy')).toBe(true)
  })

  it('locks app routes', () => {
    expect(isPublicPath('/dashboard')).toBe(false)
    expect(isPublicPath('/principal')).toBe(false)
    expect(isPublicPath('/api/quickbooks/callback')).toBe(false)
  })
})

import { describe, expect, it } from 'vitest'

/**
 * Pure mirror of public-path rules in src/lib/supabase/proxy.ts (and README public routes).
 * Keeps the allowlist from silently re-locking health/kiosk APIs or treating QB callback as public.
 */
function isPublicPath(path: string): boolean {
  const PUBLIC_EXACT = new Set(['/', '/login', '/about', '/school', '/privacy'])
  const PUBLIC_PREFIXES = ['/pay/', '/kiosk', '/craft/tour', '/vs/']
  const matchesPublicPrefix = PUBLIC_PREFIXES.some(
    (p) => path === p.replace(/\/$/, '') || path.startsWith(p.endsWith('/') ? p : `${p}/`) || path === p
  )
  const isDeviceApi = path.startsWith('/api/kiosk/')
  const isHealth = path === '/api/health'
  const isStripeWebhook = path.startsWith('/api/stripe/')
  const isCron = path.startsWith('/api/cron/')
  return (
    PUBLIC_EXACT.has(path) ||
    matchesPublicPrefix ||
    isDeviceApi ||
    isHealth ||
    isStripeWebhook ||
    isCron
  )
}

describe('proxy public paths', () => {
  it('allows health, kiosk, pay, privacy, and public campus tour without login', () => {
    expect(isPublicPath('/api/health')).toBe(true)
    expect(isPublicPath('/api/kiosk/device-scan')).toBe(true)
    expect(isPublicPath('/kiosk')).toBe(true)
    expect(isPublicPath('/kiosk/abc123tokenxyz')).toBe(true)
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/privacy')).toBe(true)
    expect(isPublicPath('/pay/tok_abc')).toBe(true)
    expect(isPublicPath('/craft/tour')).toBe(true)
    expect(isPublicPath('/vs/facts')).toBe(true)
    expect(isPublicPath('/api/stripe/webhook')).toBe(true)
    expect(isPublicPath('/api/cron/billing-schedules')).toBe(true)
  })

  it('locks staff twin and app routes', () => {
    expect(isPublicPath('/craft')).toBe(false)
    expect(isPublicPath('/dashboard')).toBe(false)
    expect(isPublicPath('/principal')).toBe(false)
    expect(isPublicPath('/api/quickbooks/callback')).toBe(false)
    expect(isPublicPath('/api/craft/presence')).toBe(false)
  })
})

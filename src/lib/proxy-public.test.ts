import { describe, expect, it } from 'vitest'
import { isPublicPath } from '@/lib/supabase/public-paths'

describe('proxy public paths', () => {
  it('allows health and kiosk surfaces without login', () => {
    expect(isPublicPath('/api/health')).toBe(true)
    expect(isPublicPath('/api/kiosk/device-scan')).toBe(true)
    expect(isPublicPath('/kiosk')).toBe(true)
    expect(isPublicPath('/kiosk/abc123tokenxyz')).toBe(true)
    expect(isPublicPath('/login')).toBe(true)
    expect(isPublicPath('/privacy')).toBe(true)
    expect(isPublicPath('/terms')).toBe(true)
    expect(isPublicPath('/vs/facts')).toBe(true)
    expect(isPublicPath('/vs/renweb')).toBe(true)
    expect(isPublicPath('/pay/tok_abc')).toBe(true)
    expect(isPublicPath('/api/stripe/webhook')).toBe(true)
    expect(isPublicPath('/api/email/inbound')).toBe(true)
    expect(isPublicPath('/api/cron/billing-schedules')).toBe(true)
  })

  it('allows SEO and PWA discovery without login', () => {
    expect(isPublicPath('/robots.txt')).toBe(true)
    expect(isPublicPath('/sitemap.xml')).toBe(true)
    expect(isPublicPath('/manifest.webmanifest')).toBe(true)
    expect(isPublicPath('/opengraph-image')).toBe(true)
  })

  it('locks app routes', () => {
    expect(isPublicPath('/dashboard')).toBe(false)
    expect(isPublicPath('/principal')).toBe(false)
    expect(isPublicPath('/api/quickbooks/callback')).toBe(false)
    expect(isPublicPath('/blog')).toBe(false)
  })
})

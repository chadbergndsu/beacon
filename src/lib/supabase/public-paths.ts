/**
 * Unauthenticated allowlist — single source for proxy + proxy-public.test.ts.
 * Keep README “Public routes” in sync when you change this.
 */

const PUBLIC_EXACT = new Set([
  '/',
  '/login',
  '/about',
  '/school',
  '/privacy',
  '/terms',
  '/vs/facts',
  '/vs/renweb',
  '/kiosk',
  '/api/health',
  // SEO / PWA discovery (must stay public or crawlers hit /login)
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.webmanifest',
  '/opengraph-image',
])

export function isPublicPath(path: string): boolean {
  if (PUBLIC_EXACT.has(path)) return true
  if (path === '/kiosk' || path.startsWith('/kiosk/')) return true
  if (path.startsWith('/api/kiosk/')) return true
  if (path.startsWith('/pay/')) return true
  if (path.startsWith('/api/stripe/')) return true
  if (path.startsWith('/api/email/')) return true
  if (path.startsWith('/api/cron/')) return true
  // Next may serve OG with extension in some setups
  if (path.startsWith('/opengraph-image')) return true
  return false
}

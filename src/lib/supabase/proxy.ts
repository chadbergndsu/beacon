import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { safeInternalPath } from '@/lib/safe-redirect'
import { KIOSK_COOKIE, KIOSK_COOKIE_MAX_AGE_SEC } from '@/lib/badge/kiosk-cookie'

/** Unauthenticated allowlist — keep in sync with README “Public routes” + proxy-public.test.ts */
const PUBLIC_EXACT = new Set(['/', '/login', '/about', '/school'])

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname

  // Kiosk bootstrap: /kiosk/{token} → HttpOnly cookie + /kiosk (strip secret from URL bar)
  const kioskBootstrap = path.match(/^\/kiosk\/([^/]+)$/)
  if (kioskBootstrap) {
    const token = decodeURIComponent(kioskBootstrap[1] || '').trim()
    if (token.length >= 12 && token !== 'run') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/kiosk'
      redirectUrl.search = ''
      const res = NextResponse.redirect(redirectUrl)
      res.cookies.set(KIOSK_COOKIE, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: KIOSK_COOKIE_MAX_AGE_SEC,
      })
      return res
    }
  }

  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    // Fail closed in production/preview: never serve protected app without auth config
    const prodLike =
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL_ENV === 'production' ||
      process.env.VERCEL_ENV === 'preview'
    const isPublicPath =
      PUBLIC_EXACT.has(path) ||
      path === '/privacy' ||
      path === '/kiosk' ||
      path.startsWith('/kiosk/') ||
      path.startsWith('/api/kiosk/') ||
      path.startsWith('/pay/') ||
      path.startsWith('/api/stripe/') ||
      path.startsWith('/api/cron/') ||
      path === '/api/health'
    if (prodLike && !isPublicPath) {
      return new NextResponse(
        'Beacon is misconfigured (missing Supabase URL or anon key).',
        { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      )
    }
    return supabaseResponse
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  const isAuthRoute = path === '/login'
  // Kiosk tablets: secret token URL or cookie session — no staff login
  const isKiosk = path === '/kiosk' || path.startsWith('/kiosk/')
  // ESP32 / RFID hardware posts with a device token (not a user session)
  const isDeviceApi = path.startsWith('/api/kiosk/')
  // Public liveness probe (detailed checks still require BEACON_HEALTH_SECRET)
  const isHealth = path === '/api/health'
  const isFamilyPay = path.startsWith('/pay/')
  const isStripeWebhook = path.startsWith('/api/stripe/')
  const isCron = path.startsWith('/api/cron/')
  const isPublic =
    PUBLIC_EXACT.has(path) ||
    isKiosk ||
    isDeviceApi ||
    isHealth ||
    isFamilyPay ||
    isStripeWebhook ||
    isCron ||
    path === '/privacy'

  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    const next = safeInternalPath(path + request.nextUrl.search, '/dashboard')
    if (next !== '/dashboard') {
      redirectUrl.searchParams.set('next', next)
    }
    return NextResponse.redirect(redirectUrl)
  }

  if (user && isAuthRoute) {
    // Don't force redirect if they already have next — login action handles role home
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    redirectUrl.search = ''
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

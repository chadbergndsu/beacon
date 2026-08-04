import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Public liveness: bare status only.
 * Detailed readiness (DB / email posture) requires BEACON_HEALTH_SECRET header.
 */
export async function GET(req: NextRequest) {
  const generatedAt = new Date().toISOString()
  const secret = process.env.BEACON_HEALTH_SECRET?.trim()
  // Header only — never query string (logs / Referer leakage)
  const provided = req.headers.get('x-beacon-health-secret')?.trim()
  const detailed = Boolean(secret && provided && secret === provided)

  if (!detailed) {
    return NextResponse.json(
      { status: 'ok', generatedAt },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' },
      }
    )
  }

  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  const { isEmailLive } = await import('@/lib/email/transport')
  const emailLive = isEmailLive()

  let dbOk = false
  let dbDetail = 'not checked'
  if (hasUrl && hasService) {
    try {
      const admin = createAdminClient()
      const { error } = await admin.from('schools').select('id').limit(1)
      if (!error) {
        dbOk = true
        dbDetail = 'reachable'
      } else {
        dbDetail = 'query failed'
      }
    } catch {
      dbDetail = 'unreachable'
    }
  } else {
    dbDetail = 'missing env'
  }

  const ok = hasUrl && hasAnon && hasService && dbOk
  return NextResponse.json(
    {
      status: ok ? 'ok' : 'degraded',
      generatedAt,
      checks: {
        supabaseEnv: hasUrl && hasAnon && hasService,
        database: dbOk,
        databaseDetail: dbDetail,
        emailLive,
      },
    },
    {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control': 'no-store' },
    }
  )
}

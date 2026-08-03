import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Public liveness / readiness probe for monitoring.
 * Never returns secret values — only booleans and coarse status.
 */
export async function GET() {
  const generatedAt = new Date().toISOString()
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim())
  const hasAnon = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim())
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
  const emailLive = Boolean(process.env.RESEND_API_KEY?.trim())

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
  const body = {
    status: ok ? 'ok' : 'degraded',
    generatedAt,
    checks: {
      supabaseEnv: hasUrl && hasAnon && hasService,
      database: dbOk,
      databaseDetail: dbDetail,
      emailLive,
    },
  }

  return NextResponse.json(body, {
    status: ok ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store',
    },
  })
}

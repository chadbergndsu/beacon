import { NextResponse } from 'next/server'
import { runDueBillingSchedulesAllSchools } from '@/lib/billing/run-schedules-all'
import { reportError } from '@/lib/ops/report-error'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * Vercel Cron: run due recurring tuition schedules for all schools.
 * vercel.json: path /api/cron/billing-schedules
 * Auth: Authorization: Bearer $CRON_SECRET
 */
function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    // Local/dev without secret: allow only non-production
    const prod =
      process.env.NODE_ENV === 'production' ||
      process.env.VERCEL_ENV === 'production' ||
      process.env.VERCEL_ENV === 'preview'
    return !prod
  }
  const auth = request.headers.get('authorization')?.trim()
  return auth === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runDueBillingSchedulesAllSchools()
    return NextResponse.json({
      ok: true,
      ...result,
      at: new Date().toISOString(),
    })
  } catch (e) {
    reportError(e, { surface: 'cron-billing-schedules' })
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Cron failed' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  return GET(request)
}

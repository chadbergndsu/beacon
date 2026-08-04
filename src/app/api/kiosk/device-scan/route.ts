import { NextResponse } from 'next/server'
import { processDeviceScan } from '@/lib/badge/store'
import type { ScanDirection } from '@/lib/badge/types'
import { rateLimit } from '@/lib/security/rate-limit'

/**
 * Hardware path for ESP32 / RFID readers / custom kiosks.
 * Auth: school device token (Principal → Badges → RFID hardware).
 *
 * POST /api/kiosk/device-scan
 * {
 *   "deviceToken": "dev_…",
 *   "code": "A1B2C3D4",
 *   "roomId": "uuid",
 *   "direction": "auto",
 *   "deviceLabel": "Door 1"
 * }
 */
export async function POST(request: Request) {
  let body: {
    deviceToken?: string
    token?: string
    code?: string
    rawCode?: string
    roomId?: string
    direction?: string
    deviceLabel?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const deviceToken = (body.deviceToken || body.token || '').trim()
  const code = (body.code || body.rawCode || '').trim()
  const roomId = (body.roomId || '').trim()
  if (!deviceToken || !code || !roomId) {
    return NextResponse.json(
      {
        ok: false,
        error: 'Required: deviceToken, code (or rawCode), roomId.',
      },
      { status: 400 }
    )
  }

  const rl = rateLimit({
    key: `device-scan:${deviceToken.slice(0, 16)}`,
    limit: 120,
    windowMs: 60_000,
  })
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: 'Rate limited. Slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)) } }
    )
  }

  const dirRaw = (body.direction || 'auto').toLowerCase()
  const direction: ScanDirection | 'auto' =
    dirRaw === 'in' || dirRaw === 'out' ? dirRaw : 'auto'

  const result = await processDeviceScan({
    deviceToken,
    rawCode: code,
    roomId,
    direction,
    deviceLabel: body.deviceLabel,
  })

  if (!result.ok) {
    // Generic error for invalid token (less oracle)
    const invalid = /Invalid device token/i.test(result.error)
    return NextResponse.json(
      { ok: false, error: invalid ? 'Unauthorized' : result.error },
      { status: invalid ? 401 : 400 }
    )
  }
  return NextResponse.json(result)
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'Method not allowed' }, { status: 405 })
}

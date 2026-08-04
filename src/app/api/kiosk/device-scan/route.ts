import { NextResponse } from 'next/server'
import { processDeviceScan } from '@/lib/badge/store'
import type { ScanDirection } from '@/lib/badge/types'

/**
 * Hardware path for ESP32 / RFID readers / custom kiosks.
 * Auth: school device token (Principal → Badges → RFID hardware).
 *
 * POST /api/kiosk/device-scan
 * {
 *   "deviceToken": "dev_…",
 *   "code": "A1B2C3D4",       // badge or RFID UID
 *   "roomId": "uuid",
 *   "direction": "auto",     // "in" | "out" | "auto" (default auto)
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
    const status = /Invalid device token/i.test(result.error) ? 401 : 400
    return NextResponse.json(result, { status })
  }
  return NextResponse.json(result)
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'beacon-device-scan',
    usage:
      'POST { deviceToken, code, roomId, direction?: "in"|"out"|"auto", deviceLabel? }',
  })
}

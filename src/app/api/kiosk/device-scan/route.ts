import { NextResponse } from 'next/server'
import { processDeviceScan } from '@/lib/badge/store'
import type { ScanDirection } from '@/lib/badge/types'
import { rateLimitAsync } from '@/lib/security/rate-limit'
import { deviceScanBodySchema } from '@/lib/validation/schemas'

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
  let raw: Record<string, unknown>
  try {
    raw = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 })
  }

  const normalized = {
    deviceToken: String(raw.deviceToken || raw.token || '').trim(),
    code: String(raw.code || raw.rawCode || '').trim(),
    roomId: String(raw.roomId || '').trim(),
    direction: raw.direction ? String(raw.direction).toLowerCase() : undefined,
    deviceLabel: raw.deviceLabel ? String(raw.deviceLabel) : undefined,
  }

  const parsed = deviceScanBodySchema.safeParse(normalized)
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message || 'Required: deviceToken, code, roomId (UUID).',
      },
      { status: 400 }
    )
  }

  const { deviceToken, code, roomId, deviceLabel } = parsed.data
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  const rlToken = await rateLimitAsync({
    key: `device-scan:${deviceToken.slice(0, 16)}`,
    limit: 90,
    windowMs: 60_000,
  })
  const rlIp = await rateLimitAsync({
    key: `device-scan-ip:${ip}`,
    limit: 120,
    windowMs: 60_000,
  })
  if (!rlToken.ok || !rlIp.ok) {
    const retry = Math.max(
      rlToken.ok ? 0 : rlToken.retryAfterMs,
      rlIp.ok ? 0 : rlIp.retryAfterMs
    )
    return NextResponse.json(
      { ok: false, error: 'Rate limited. Slow down.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(retry / 1000) || 60) } }
    )
  }

  const dirRaw = (parsed.data.direction || 'auto').toLowerCase()
  const direction: ScanDirection | 'auto' =
    dirRaw === 'in' || dirRaw === 'out' ? dirRaw : 'auto'

  const result = await processDeviceScan({
    deviceToken,
    rawCode: code,
    roomId,
    direction,
    deviceLabel,
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

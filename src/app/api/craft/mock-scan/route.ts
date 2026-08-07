import { NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCraftProfile } from '@/lib/craft/auth-api'
import { canTriggerMockScans } from '@/lib/craft/presence'
import { getRoomById } from '@/lib/craft/layout'
import { loadCraftLayoutForSchool } from '@/lib/craft/settings'
import { upsertMockPresence } from '@/lib/craft/presence-store'
import { rateLimitAsync } from '@/lib/security/rate-limit'

const bodySchema = z.object({
  studentId: z.string().trim().min(1).max(120),
  studentName: z.string().trim().min(1).max(120).optional(),
  roomId: z.string().trim().min(1).max(120),
  timestamp: z.string().datetime().optional(),
})

export async function POST(request: Request) {
  const auth = await requireCraftProfile()
  if (!auth.ok) return auth.response

  if (!canTriggerMockScans(auth.profile.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 })
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  const rl = await rateLimitAsync({
    key: `craft-mock-scan:${auth.userId}`,
    limit: 60,
    windowMs: 60_000,
  })
  const rlIp = await rateLimitAsync({
    key: `craft-mock-scan-ip:${ip}`,
    limit: 120,
    windowMs: 60_000,
  })
  if (!rl.ok || !rlIp.ok) {
    return NextResponse.json({ ok: false, error: 'Rate limited.' }, { status: 429 })
  }

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON.' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message || 'Invalid body.' },
      { status: 400 }
    )
  }

  const layout = await loadCraftLayoutForSchool(auth.profile.school_id!)
  const room = getRoomById(layout, parsed.data.roomId)
  if (!room) {
    return NextResponse.json({ ok: false, error: 'Unknown roomId for demo layout.' }, { status: 400 })
  }

  const rec = upsertMockPresence({
    schoolId: auth.profile.school_id!,
    studentId: parsed.data.studentId,
    studentName: parsed.data.studentName || `Student ${parsed.data.studentId.slice(0, 6)}`,
    roomId: parsed.data.roomId,
    since: parsed.data.timestamp,
  })

  return NextResponse.json({ ok: true, record: rec })
}

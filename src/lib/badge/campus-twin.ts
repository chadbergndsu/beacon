/**
 * Beacon → campus twin presence bridge (ADR 001).
 *
 * After a successful badge scan:
 * 1. Integrated `/craft` — upsert mock presence using school room map (same-origin).
 * 2. Optional legacy external twin — POST when BEACONCRAFT_URL is an absolute
 *    external host and BEACONCRAFT_SCAN_API_KEY is set.
 *
 * Never throws; never blocks attendance.
 *
 * Configure:
 *   (preferred) Go-live room mapping + integrated /craft — no extra env
 *   BEACONCRAFT_ROOM_MAP={"<beacon-room-uuid>":"craft-demo-room-101"}
 *   BEACONCRAFT_URL=https://beaconcraft.vercel.app  # legacy external only
 *   BEACONCRAFT_SCAN_API_KEY=<craft SCAN_API_KEY>
 */

import { CRAFT_DEMO_ROOM_IDS } from '@/lib/craft/demo-ids'

export type TwinScanNotify = {
  schoolId: string
  studentId: string
  studentName: string
  roomId: string
  roomName: string
  direction: 'in' | 'out'
}

/** Heuristic: room names → integrated craft demo layout ids. */
const NAME_HINTS: { re: RegExp; craftId: string }[] = [
  { re: /\b101\b/, craftId: CRAFT_DEMO_ROOM_IDS.room101 },
  { re: /\b102\b/, craftId: CRAFT_DEMO_ROOM_IDS.room102 },
  { re: /\b103\b/, craftId: CRAFT_DEMO_ROOM_IDS.room103 },
  { re: /\ba\s*[-]?\s*101\b/i, craftId: CRAFT_DEMO_ROOM_IDS.room101 },
  { re: /\ba\s*[-]?\s*102\b/i, craftId: CRAFT_DEMO_ROOM_IDS.room102 },
  { re: /\bgym|multipurpose/i, craftId: CRAFT_DEMO_ROOM_IDS.gym },
  { re: /\boffice|admin|front\s*desk/i, craftId: CRAFT_DEMO_ROOM_IDS.office },
  { re: /\bentrance|lobby|check.?in/i, craftId: CRAFT_DEMO_ROOM_IDS.entrance },
  { re: /\bhall/i, craftId: CRAFT_DEMO_ROOM_IDS.hall },
  { re: /\b201\b/, craftId: 'craft-demo-room-201' },
  { re: /\b202\b/, craftId: 'craft-demo-room-202' },
  { re: /\b203|media/i, craftId: 'craft-demo-room-203' },
  { re: /\bstaff\s*lounge/i, craftId: 'craft-demo-room-204' },
]

function parseRoomMap(): Record<string, string> {
  const raw = process.env.BEACONCRAFT_ROOM_MAP?.trim()
  if (!raw) return {}
  try {
    const o = JSON.parse(raw) as unknown
    if (!o || typeof o !== 'object') return {}
    const out: Record<string, string> = {}
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim()
    }
    return out
  } catch {
    return {}
  }
}

export function resolveCraftRoomId(roomId: string, roomName: string): string | null {
  const map = parseRoomMap()
  if (map[roomId]) return map[roomId]
  for (const { re, craftId } of NAME_HINTS) {
    if (re.test(roomName)) return craftId
  }
  return null
}

/** True when BEACONCRAFT_URL points at a separate host (legacy twin). */
export function isExternalCraftUrl(url: string | null | undefined): boolean {
  const raw = url?.trim()
  if (!raw) return false
  if (raw.startsWith('/')) return false
  try {
    const u = new URL(raw)
    const host = u.hostname.toLowerCase()
    if (host === 'localhost' || host === '127.0.0.1') return false
    const app =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : '')
    if (app) {
      try {
        if (new URL(app).hostname.toLowerCase() === host) return false
      } catch {
        /* ignore */
      }
    }
    return true
  } catch {
    return false
  }
}

function externalCraftBaseUrl(): string | null {
  const raw =
    process.env.BEACONCRAFT_URL?.trim() ||
    process.env.NEXT_PUBLIC_BEACONCRAFT_URL?.trim() ||
    ''
  if (!raw || !isExternalCraftUrl(raw)) return null
  return raw.replace(/\/$/, '')
}

function craftScanKey(): string | null {
  const k = process.env.BEACONCRAFT_SCAN_API_KEY?.trim()
  return k || null
}

/**
 * Fire-and-forget. Safe to call after attendance is already committed.
 */
export function notifyCampusTwin(scan: TwinScanNotify): void {
  void notifyCampusTwinAsync(scan)
}

async function notifyCampusTwinAsync(scan: TwinScanNotify): Promise<void> {
  let craftRoom =
    scan.direction === 'out'
      ? resolveCraftRoomId(scan.roomId, scan.roomName) || CRAFT_DEMO_ROOM_IDS.entrance
      : resolveCraftRoomId(scan.roomId, scan.roomName)

  // Prefer Go-live saved mapping (db room uuid → layout room id)
  try {
    const { loadCraftRoomMapping } = await import('@/lib/craft/rooms')
    const { dbToLayout } = await loadCraftRoomMapping(scan.schoolId)
    const mapped = dbToLayout[scan.roomId]
    if (mapped) craftRoom = mapped
  } catch {
    /* mapping optional */
  }

  if (scan.direction === 'in' && !craftRoom) return
  if (!craftRoom) return

  // Integrated twin: in-memory overlay so /craft updates immediately
  try {
    const { upsertMockPresence, clearMockPresenceForStudent } = await import(
      '@/lib/craft/presence-store'
    )
    if (scan.direction === 'out') {
      clearMockPresenceForStudent(scan.schoolId, scan.studentId)
    } else {
      upsertMockPresence({
        schoolId: scan.schoolId,
        studentId: scan.studentId,
        studentName: scan.studentName,
        roomId: craftRoom,
      })
    }
  } catch {
    /* ignore */
  }

  // Legacy external BeaconCraft deploy
  const base = externalCraftBaseUrl()
  const key = craftScanKey()
  if (!base || !key) return

  const body = {
    userId: scan.studentId,
    roomId: craftRoom,
    // Public twin must never receive real minor names
    displayName: 'Student',
    role: 'student' as const,
    timestamp: new Date().toISOString(),
  }

  void fetch(`${base}/api/scans`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
    },
    body: JSON.stringify(body),
  }).catch(() => {
    /* twin is visualization only — do not surface to kiosk */
  })
}

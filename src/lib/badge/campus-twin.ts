/**
 * Beacon → BeaconCraft presence bridge (ADR 001).
 *
 * After a successful badge scan, optionally POST to the 3D twin so kids
 * appear in the matching room. Never throws; never blocks attendance.
 *
 * Configure on Beacon:
 *   BEACONCRAFT_URL=https://beaconcraft.vercel.app
 *   BEACONCRAFT_SCAN_API_KEY=<same as craft SCAN_API_KEY>
 * Optional:
 *   BEACONCRAFT_ROOM_MAP={"<beacon-room-uuid>":"room-a101"}
 */

export type TwinScanNotify = {
  studentId: string
  studentName: string
  roomId: string
  roomName: string
  direction: 'in' | 'out'
}

/** Heuristic: "A101" / "Room A-101" → room-a101; known labels from craft layout. */
const NAME_HINTS: { re: RegExp; craftId: string }[] = [
  { re: /\ba\s*[-]?\s*101\b/i, craftId: 'room-a101' },
  { re: /\ba\s*[-]?\s*102\b/i, craftId: 'room-a102' },
  { re: /\bb\s*[-]?\s*203\b/i, craftId: 'room-b203' },
  { re: /\bgym|multipurpose/i, craftId: 'room-gym' },
  { re: /\bchapel/i, craftId: 'room-chapel' },
  { re: /\boffice|admin/i, craftId: 'room-office' },
  { re: /\bentrance|lobby|check.?in/i, craftId: 'room-entrance' },
  { re: /\bhall/i, craftId: 'room-hallway' },
  { re: /\blibrary|media/i, craftId: 'room-library' },
  { re: /\bart|maker/i, craftId: 'room-art' },
  { re: /\bplay|recess|yard/i, craftId: 'room-playground' },
  { re: /\bpark|drop.?off/i, craftId: 'room-parking' },
  { re: /\baftercare|extended/i, craftId: 'room-yard' },
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

function craftBaseUrl(): string | null {
  const raw =
    process.env.BEACONCRAFT_URL?.trim() || process.env.NEXT_PUBLIC_BEACONCRAFT_URL?.trim()
  if (!raw) return null
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
  const base = craftBaseUrl()
  const key = craftScanKey()
  if (!base || !key) return

  const craftRoom =
    scan.direction === 'out'
      ? resolveCraftRoomId(scan.roomId, scan.roomName) || 'room-parking'
      : resolveCraftRoomId(scan.roomId, scan.roomName)

  // IN requires a mapped room; unmapped rooms skip silently until map is set.
  if (scan.direction === 'in' && !craftRoom) return
  if (!craftRoom) return

  const body = {
    userId: scan.studentId,
    roomId: craftRoom,
    displayName: scan.studentName,
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

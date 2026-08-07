import type { CraftFloorLayout, CraftRoomDef } from './types'

/** Stable demo room IDs — map to real `school_rooms` by name when a school is linked. */
export const CRAFT_DEMO_ROOM_IDS = {
  entrance: 'craft-demo-entrance',
  hall: 'craft-demo-hall',
  room101: 'craft-demo-room-101',
  room102: 'craft-demo-room-102',
  room103: 'craft-demo-room-103',
  office: 'craft-demo-office',
  gym: 'craft-demo-gym',
} as const

function room(
  roomId: string,
  name: string,
  kind: CraftRoomDef['kind'],
  origin: [number, number, number],
  size: [number, number, number],
  color: string
): CraftRoomDef {
  return { roomId, name, kind, origin, size, color }
}

/** Single-floor example campus — replace or extend via JSON import later. */
export const DEMO_SCHOOL_LAYOUT: CraftFloorLayout = {
  version: 1,
  id: 'demo-pilot-floor-1',
  name: 'Pilot Elementary — Floor 1',
  blockSize: 1,
  floorY: 0,
  rooms: [
    room(CRAFT_DEMO_ROOM_IDS.entrance, 'Main Entrance', 'other', [18, 0, 28], [12, 4, 4], '#cbd5e1'),
    room(CRAFT_DEMO_ROOM_IDS.hall, 'Main Hall', 'other', [20, 0, 8], [8, 4, 20], '#e2e8f0'),
    room(CRAFT_DEMO_ROOM_IDS.room101, 'Room 101', 'classroom', [4, 0, 16], [14, 4, 10], '#bfdbfe'),
    room(CRAFT_DEMO_ROOM_IDS.room102, 'Room 102', 'classroom', [4, 0, 4], [14, 4, 10], '#93c5fd'),
    room(CRAFT_DEMO_ROOM_IDS.room103, 'Room 103', 'classroom', [30, 0, 16], [14, 4, 10], '#bbf7d0'),
    room(CRAFT_DEMO_ROOM_IDS.office, 'Front Office', 'office', [30, 0, 4], [14, 4, 10], '#fde68a'),
    room(CRAFT_DEMO_ROOM_IDS.gym, 'Gymnasium', 'gym', [30, 0, 28], [14, 5, 8], '#fca5a5'),
  ],
}

export function getRoomById(layout: CraftFloorLayout, roomId: string): CraftRoomDef | undefined {
  return layout.rooms.find((r) => r.roomId === roomId)
}

export function getRoomCenter(room: CraftRoomDef): [number, number, number] {
  const [ox, oy, oz] = room.origin
  const [w, h, d] = room.size
  return [ox + w / 2, oy + h / 2, oz + d / 2]
}

export function getRoomByName(layout: CraftFloorLayout, query: string): CraftRoomDef | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  return layout.rooms.find(
    (r) => r.roomId.toLowerCase() === q || r.name.toLowerCase().includes(q)
  )
}

/** Match layout rooms to live `school_rooms` rows by case-insensitive name. */
export function buildRoomIdMap(
  layout: CraftFloorLayout,
  schoolRooms: { id: string; name: string }[]
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const lr of layout.rooms) {
    const match = schoolRooms.find((sr) => sr.name.trim().toLowerCase() === lr.name.trim().toLowerCase())
    if (match) map[lr.roomId] = match.id
  }
  return map
}

export function invertRoomIdMap(map: Record<string, string>): Record<string, string> {
  const inv: Record<string, string> = {}
  for (const [layoutId, dbId] of Object.entries(map)) {
    inv[dbId] = layoutId
  }
  return inv
}

export function layoutBounds(layout: CraftFloorLayout): {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
} {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const r of layout.rooms) {
    const [x, , z] = r.origin
    const [w, , d] = r.size
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x + w)
    minZ = Math.min(minZ, z)
    maxZ = Math.max(maxZ, z + d)
  }
  return { minX, maxX, minZ, maxZ }
}

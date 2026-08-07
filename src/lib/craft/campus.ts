import type {
  CraftCampusLayout,
  CraftFloorLayoutV1,
  CraftFloorLevel,
  CraftPortalDef,
  CraftRoomDef,
} from './types'

export function isCampusV1(input: unknown): input is CraftFloorLayoutV1 {
  return Boolean(input && typeof input === 'object' && (input as CraftFloorLayoutV1).version === 1)
}

export function normalizeCampusLayout(input: unknown): CraftCampusLayout | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  if (raw.version === 2) {
    const floors = raw.floors as CraftFloorLevel[] | undefined
    if (!floors?.length) return null
    return {
      version: 2,
      id: String(raw.id || 'campus'),
      name: String(raw.name || 'Campus'),
      blockSize: Number(raw.blockSize) || 1,
      floors,
      portals: (raw.portals as CraftPortalDef[]) || [],
    }
  }
  if (raw.version === 1) {
    const v1 = raw as unknown as CraftFloorLayoutV1
    if (!v1.rooms?.length) return null
    return {
      version: 2,
      id: v1.id,
      name: v1.name,
      blockSize: v1.blockSize,
      floors: [
        {
          floorId: 'floor-1',
          name: 'Floor 1',
          elevationY: v1.floorY ?? 0,
          rooms: v1.rooms,
        },
      ],
      portals: [],
    }
  }
  return null
}

export function getFloor(layout: CraftCampusLayout, floorId: string): CraftFloorLevel | undefined {
  return layout.floors.find((f) => f.floorId === floorId)
}

export function getDefaultFloorId(layout: CraftCampusLayout): string {
  return layout.floors[0]?.floorId ?? 'floor-1'
}

export function allRooms(layout: CraftCampusLayout): CraftRoomDef[] {
  return layout.floors.flatMap((f) => f.rooms)
}

export function getRoomById(layout: CraftCampusLayout, roomId: string): CraftRoomDef | undefined {
  return allRooms(layout).find((r) => r.roomId === roomId)
}

export function getRoomFloorId(layout: CraftCampusLayout, roomId: string): string | undefined {
  for (const floor of layout.floors) {
    if (floor.rooms.some((r) => r.roomId === roomId)) return floor.floorId
  }
  return undefined
}

export function getRoomByName(layout: CraftCampusLayout, query: string): CraftRoomDef | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  return allRooms(layout).find(
    (r) => r.roomId.toLowerCase() === q || r.name.toLowerCase().includes(q)
  )
}

export function getRoomCenter(
  layout: CraftCampusLayout,
  room: CraftRoomDef
): [number, number, number] {
  const floorId = getRoomFloorId(layout, room.roomId)
  const floor = floorId ? getFloor(layout, floorId) : layout.floors[0]
  const elev = floor?.elevationY ?? 0
  const [ox, oy, oz] = room.origin
  const [w, h, d] = room.size
  return [ox + w / 2, elev + oy + h / 2, oz + d / 2]
}

export function layoutBounds(
  layout: CraftCampusLayout,
  floorId?: string
): { minX: number; maxX: number; minZ: number; maxZ: number } {
  const floors = floorId ? layout.floors.filter((f) => f.floorId === floorId) : layout.floors
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  for (const floor of floors) {
    for (const r of floor.rooms) {
      const [x, , z] = r.origin
      const [w, , d] = r.size
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x + w)
      minZ = Math.min(minZ, z)
      maxZ = Math.max(maxZ, z + d)
    }
  }
  return { minX, maxX, minZ, maxZ }
}

export function portalsOnFloor(layout: CraftCampusLayout, floorId: string): CraftPortalDef[] {
  return layout.portals.filter((p) => p.floorId === floorId)
}

export function worldPortalAabb(
  layout: CraftCampusLayout,
  portal: CraftPortalDef
): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } {
  const floor = getFloor(layout, portal.floorId)
  const elev = floor?.elevationY ?? 0
  const [ox, oy, oz] = portal.origin
  const [w, h, d] = portal.size
  return {
    minX: ox,
    maxX: ox + w,
    minY: elev + oy,
    maxY: elev + oy + h,
    minZ: oz,
    maxZ: oz + d,
  }
}

/** Match layout rooms to live `school_rooms` rows by case-insensitive name. */
export function buildRoomIdMap(
  layout: CraftCampusLayout,
  schoolRooms: { id: string; name: string }[]
): Record<string, string> {
  const map: Record<string, string> = {}
  for (const lr of allRooms(layout)) {
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

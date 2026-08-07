import type { RoomKind } from '@/lib/badge/types'
import type { CraftFloorLayout, CraftRoomDef } from './types'

export type CraftAabb = {
  minX: number
  maxX: number
  minY: number
  maxY: number
  minZ: number
  maxZ: number
}

export type CraftBlockInstance = {
  key: string
  position: [number, number, number]
  size: [number, number, number]
  color: string
  emissive?: string
  emissiveIntensity?: number
  metalness?: number
  roughness?: number
}

export type CraftRoomLight = {
  roomId: string
  position: [number, number, number]
  color: string
  intensity: number
}

export type CraftSchoolGeometry = {
  floors: CraftBlockInstance[]
  walls: CraftBlockInstance[]
  trims: CraftBlockInstance[]
  ceilings: CraftBlockInstance[]
  doors: CraftBlockInstance[]
  windows: CraftBlockInstance[]
  collision: CraftAabb[]
  lights: CraftRoomLight[]
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number }
}

const WALL = '#8b9cb3'
const TRIM = '#64748b'
const CEILING = '#f1f5f9'
const DOOR = '#92400e'
const GLASS = '#7dd3fc'

function paletteForKind(kind: RoomKind): { floor: string; accent: string; light: string } {
  switch (kind) {
    case 'classroom':
      return { floor: '#bfdbfe', accent: '#3b82f6', light: '#fef3c7' }
    case 'office':
      return { floor: '#fde68a', accent: '#d97706', light: '#e0f2fe' }
    case 'gym':
      return { floor: '#fca5a5', accent: '#dc2626', light: '#ffffff' }
    case 'aftercare':
      return { floor: '#ddd6fe', accent: '#7c3aed', light: '#fce7f3' }
    default:
      return { floor: '#e2e8f0', accent: '#64748b', light: '#f8fafc' }
  }
}

function pushBlock(
  out: CraftBlockInstance[],
  key: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string,
  opts?: Partial<CraftBlockInstance>
) {
  out.push({
    key,
    position: [x + w / 2, y + h / 2, z + d / 2],
    size: [w, h, d],
    color,
    ...opts,
  })
}

function pushCollision(out: CraftAabb[], x: number, y: number, z: number, w: number, h: number, d: number) {
  out.push({
    minX: x,
    maxX: x + w,
    minY: y,
    maxY: y + h,
    minZ: z,
    maxZ: z + d,
  })
}

function buildRoomGeometry(room: CraftRoomDef, geo: CraftSchoolGeometry) {
  const [ox, oy, oz] = room.origin
  const [w, h, d] = room.size
  const t = 0.28
  const palette = paletteForKind(room.kind)
  const floorColor = room.color || palette.floor

  pushBlock(geo.floors, `${room.roomId}-floor`, ox, oy, oz, w, 0.12, d, floorColor, {
    roughness: 0.85,
  })
  pushBlock(geo.trims, `${room.roomId}-base`, ox + 0.05, oy + 0.12, oz + 0.05, w - 0.1, 0.08, d - 0.1, palette.accent, {
    roughness: 0.6,
  })
  pushBlock(geo.ceilings, `${room.roomId}-ceil`, ox, oy + h - 0.08, oz, w, 0.08, d, CEILING, {
    roughness: 0.95,
  })

  const doorGap = Math.min(3.2, w * 0.32)
  const gapStart = ox + (w - doorGap) / 2

  // North wall (-Z) with doorway
  pushBlock(geo.walls, `${room.roomId}-n-l`, ox, oy, oz, gapStart - ox, h, t, WALL)
  pushBlock(geo.walls, `${room.roomId}-n-r`, gapStart + doorGap, oy, oz, ox + w - (gapStart + doorGap), h, t, WALL)
  pushCollision(geo.collision, ox, oy, oz, gapStart - ox, h, t)
  pushCollision(geo.collision, gapStart + doorGap, oy, oz, ox + w - (gapStart + doorGap), h, t)

  pushBlock(geo.doors, `${room.roomId}-frame-l`, gapStart, oy, oz - 0.02, 0.12, h, t + 0.04, DOOR)
  pushBlock(geo.doors, `${room.roomId}-frame-r`, gapStart + doorGap - 0.12, oy, oz - 0.02, 0.12, h, t + 0.04, DOOR)
  pushBlock(geo.doors, `${room.roomId}-lintel`, gapStart, oy + h - 0.35, oz - 0.02, doorGap, 0.35, t + 0.04, DOOR)

  // South wall (+Z)
  pushBlock(geo.walls, `${room.roomId}-s`, ox, oy, oz + d - t, w, h, t, WALL)
  pushCollision(geo.collision, ox, oy, oz + d - t, w, h, t)

  // West wall (-X) with window band
  pushBlock(geo.walls, `${room.roomId}-w-b`, ox, oy, oz, t, h * 0.35, d, WALL)
  pushBlock(geo.walls, `${room.roomId}-w-t`, ox, oy + h * 0.75, oz, t, h * 0.25, d, WALL)
  pushBlock(geo.windows, `${room.roomId}-w-win`, ox + 0.02, oy + h * 0.38, oz + d * 0.2, t - 0.04, h * 0.32, d * 0.55, GLASS, {
    emissive: '#38bdf8',
    emissiveIntensity: 0.15,
    metalness: 0.2,
    roughness: 0.1,
  })
  pushCollision(geo.collision, ox, oy, oz, t, h, d)

  // East wall (+X)
  pushBlock(geo.walls, `${room.roomId}-e-b`, ox + w - t, oy, oz, t, h * 0.35, d, WALL)
  pushBlock(geo.walls, `${room.roomId}-e-t`, ox + w - t, oy + h * 0.75, oz, t, h * 0.25, d, WALL)
  pushBlock(
    geo.windows,
    `${room.roomId}-e-win`,
    ox + w - t + 0.02,
    oy + h * 0.38,
    oz + d * 0.15,
    t - 0.04,
    h * 0.32,
    d * 0.55,
    GLASS,
    {
      emissive: '#38bdf8',
      emissiveIntensity: 0.15,
      metalness: 0.2,
      roughness: 0.1,
    }
  )
  pushCollision(geo.collision, ox + w - t, oy, oz, t, h, d)

  geo.lights.push({
    roomId: room.roomId,
    position: [ox + w / 2, oy + h - 0.35, oz + d / 2],
    color: palette.light,
    intensity: room.kind === 'gym' ? 1.4 : 0.85,
  })
}

export function buildSchoolGeometry(layout: CraftFloorLayout): CraftSchoolGeometry {
  const geo: CraftSchoolGeometry = {
    floors: [],
    walls: [],
    trims: [],
    ceilings: [],
    doors: [],
    windows: [],
    collision: [],
    lights: [],
    bounds: { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
  }

  for (const room of layout.rooms) {
    buildRoomGeometry(room, geo)
    const [x, , z] = room.origin
    const [w, , d] = room.size
    geo.bounds.minX = Math.min(geo.bounds.minX, x)
    geo.bounds.maxX = Math.max(geo.bounds.maxX, x + w)
    geo.bounds.minZ = Math.min(geo.bounds.minZ, z)
    geo.bounds.maxZ = Math.max(geo.bounds.maxZ, z + d)
  }

  return geo
}

export function roomFloorAabb(room: CraftRoomDef): CraftAabb {
  const [ox, oy, oz] = room.origin
  const [w, , d] = room.size
  return { minX: ox, maxX: ox + w, minY: oy, maxY: oy + 4, minZ: oz, maxZ: oz + d }
}

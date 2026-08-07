import type { RoomKind } from '@/lib/badge/types'

/** One explorable room volume in the voxel twin (maps to `school_rooms.id` when integrated). */
export type CraftRoomDef = {
  roomId: string
  name: string
  kind: RoomKind
  /** Bottom-left corner [x, y, z] in block units (y relative to floor elevation). */
  origin: [number, number, number]
  /** Interior size [widthX, heightY, depthZ] in blocks. */
  size: [number, number, number]
  /** Floor tint (hex). */
  color: string
}

export type CraftPortalDef = {
  portalId: string
  kind: 'stairs' | 'elevator'
  floorId: string
  origin: [number, number, number]
  size: [number, number, number]
  targetFloorId: string
  targetRoomId?: string
  label: string
}

export type CraftFloorLevel = {
  floorId: string
  name: string
  elevationY: number
  rooms: CraftRoomDef[]
}

/** v1 legacy single-floor layout (normalized to v2 at load). */
export type CraftFloorLayoutV1 = {
  version: 1
  id: string
  name: string
  blockSize: number
  floorY: number
  rooms: CraftRoomDef[]
}

/** v2 multi-floor campus layout. */
export type CraftCampusLayout = {
  version: 2
  id: string
  name: string
  blockSize: number
  floors: CraftFloorLevel[]
  portals: CraftPortalDef[]
}

/** Canonical layout type used across BeaconCraft. */
export type CraftFloorLayout = CraftCampusLayout

export type CraftPresenceRecord = {
  studentId: string
  studentName: string
  roomId: string
  since: string
  source: 'mock' | 'badge'
}

export type CraftVisibleMarker = {
  id: string
  label: string
  roomId: string
  since: string
  anonymized: boolean
}

export type CraftTrailPoint = {
  studentId: string
  studentName: string
  roomId: string
  since: string
}

export type CraftStudentOption = {
  id: string
  name: string
  gradeLevel: string | null
}

export type CraftViewerContext = {
  role: import('@/lib/types').Role
  userId: string
  schoolId: string | null
  teacherRoomIds: string[]
  parentStudentIds: string[]
  flyMode: boolean
  anonymizeOthers: boolean
}

import type { RoomKind } from '@/lib/badge/types'
import type { Role } from '@/lib/types'

/** One explorable room volume in the voxel twin (maps to `school_rooms.id` when integrated). */
export type CraftRoomDef = {
  roomId: string
  name: string
  kind: RoomKind
  /** Bottom-left corner [x, y, z] in block units. */
  origin: [number, number, number]
  /** Interior size [widthX, heightY, depthZ] in blocks. */
  size: [number, number, number]
  /** Floor tint (hex). */
  color: string
}

export type CraftFloorLayout = {
  version: 1
  id: string
  name: string
  blockSize: number
  floorY: number
  rooms: CraftRoomDef[]
}

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
  role: Role
  userId: string
  schoolId: string | null
  /** Layout room IDs a teacher may see (typically their classroom). */
  teacherRoomIds: string[]
  /** Student IDs linked to a parent account. */
  parentStudentIds: string[]
  /** Admin-only fly + campus-wide named presence. */
  flyMode: boolean
  anonymizeOthers: boolean
}

import { isLeadership } from '@/lib/roles'
import type { Role } from '@/lib/types'
import { allRooms } from './campus'
import type {
  CraftCampusLayout,
  CraftPresenceRecord,
  CraftVisibleMarker,
  CraftViewerContext,
} from './types'

export function canUseFlyMode(role: Role | null | undefined): boolean {
  return isLeadership(role)
}

export function canTriggerMockScans(role: Role | null | undefined): boolean {
  return isLeadership(role)
}

export function defaultAnonymizeForRole(role: Role): boolean {
  return role === 'parent'
}

/** Friendly demo teachers standing in each classroom / office — Olivia’s “all the teachers”. */
const DEMO_TEACHER_NAMES = [
  'Ms. Hart',
  'Mr. Cole',
  'Ms. Rivera',
  'Mr. Blake',
  'Ms. Nguyen',
  'Mr. Patel',
  'Ms. Owens',
  'Mr. Diaz',
]

export function staffMarkersForLayout(layout: CraftCampusLayout): CraftVisibleMarker[] {
  const rooms = allRooms(layout).filter(
    (r) => r.kind === 'classroom' || r.kind === 'office' || r.kind === 'gym'
  )
  const since = '2026-08-07T12:00:00.000Z'
  return rooms.map((room, i) => ({
    id: `teacher-${room.roomId}`,
    label: DEMO_TEACHER_NAMES[i % DEMO_TEACHER_NAMES.length]!,
    roomId: room.roomId,
    since,
    anonymized: false,
    kind: 'teacher' as const,
  }))
}

export function filterPresenceForViewer(
  records: CraftPresenceRecord[],
  ctx: Pick<
    CraftViewerContext,
    'role' | 'teacherRoomIds' | 'parentStudentIds' | 'anonymizeOthers'
  >
): CraftVisibleMarker[] {
  const markers: CraftVisibleMarker[] = []

  for (const rec of records) {
    const visible = visibilityForRecord(rec, ctx)
    if (!visible) continue
    markers.push(visible)
  }

  return markers.sort((a, b) => a.label.localeCompare(b.label))
}

/** Merge live student presence with teachers-in-rooms for the twin. */
export function mergePresenceWithStaff(
  studentMarkers: CraftVisibleMarker[],
  layout: CraftCampusLayout
): CraftVisibleMarker[] {
  const staff = staffMarkersForLayout(layout)
  const byId = new Map<string, CraftVisibleMarker>()
  for (const m of [...staff, ...studentMarkers]) {
    byId.set(m.id, m)
  }
  return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label))
}

function visibilityForRecord(
  rec: CraftPresenceRecord,
  ctx: Pick<
    CraftViewerContext,
    'role' | 'teacherRoomIds' | 'parentStudentIds' | 'anonymizeOthers'
  >
): CraftVisibleMarker | null {
  const { role, teacherRoomIds, parentStudentIds, anonymizeOthers } = ctx

  if (isLeadership(role)) {
    return {
      id: rec.studentId,
      label: rec.studentName,
      roomId: rec.roomId,
      since: rec.since,
      anonymized: false,
      kind: 'student',
    }
  }

  if (role === 'teacher') {
    if (!teacherRoomIds.includes(rec.roomId)) return null
    return {
      id: rec.studentId,
      label: rec.studentName,
      roomId: rec.roomId,
      since: rec.since,
      anonymized: false,
      kind: 'student',
    }
  }

  if (role === 'parent') {
    const linked = parentStudentIds.includes(rec.studentId)
    if (linked) {
      return {
        id: rec.studentId,
        label: rec.studentName,
        roomId: rec.roomId,
        since: rec.since,
        anonymized: false,
        kind: 'student',
      }
    }
    if (anonymizeOthers) {
      return {
        id: rec.studentId,
        label: 'Guest',
        roomId: rec.roomId,
        since: rec.since,
        anonymized: true,
        kind: 'student',
      }
    }
    return null
  }

  return null
}

export function pickTeacherFocusRoom(
  teacherRoomIds: string[],
  layoutRoomIds: string[]
): string | null {
  const hit = teacherRoomIds.find((id) => layoutRoomIds.includes(id))
  return hit ?? teacherRoomIds[0] ?? layoutRoomIds[0] ?? null
}

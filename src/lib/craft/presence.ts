import { isLeadership } from '@/lib/roles'
import type { Role } from '@/lib/types'
import { allRooms, getRoomById } from './campus'
import { LIGHTHOUSE_STAFF } from './lighthouse-staff'
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

/** Fictional minors only — never use real family names on public/demo surfaces. */
export const FAKE_DEMO_STUDENTS = [
  { id: 'demo-stu-jordan', name: 'Jordan Lee', gradeLevel: '3' },
  { id: 'demo-stu-sam', name: 'Sam Ortiz', gradeLevel: '4' },
  { id: 'demo-stu-riley', name: 'Riley Kim', gradeLevel: '2' },
  { id: 'demo-stu-casey', name: 'Casey Brooks', gradeLevel: '5' },
] as const

/** Fallback teacher labels when a room has no mapped staff yet. */
const FALLBACK_TEACHER_NAMES = [
  'Ms. Hart',
  'Mr. Cole',
  'Ms. Rivera',
  'Mr. Blake',
  'Ms. Nguyen',
  'Mr. Patel',
  'Ms. Owens',
  'Mr. Diaz',
]

export function staffMarkersForLayout(
  layout: CraftCampusLayout,
  teacherNameByRoom: Record<string, string> = {}
): CraftVisibleMarker[] {
  const since = new Date().toISOString()

  // Prefer named Lighthouse staff when those rooms exist on the layout
  const lighthouse = LIGHTHOUSE_STAFF.filter((s) => getRoomById(layout, s.roomId))
  if (lighthouse.length) {
    return lighthouse.map((s) => {
      const override = teacherNameByRoom[s.roomId]?.trim()
      return {
        id: `teacher-${s.staffId}`,
        label: override || s.name,
        roomId: s.roomId,
        since,
        anonymized: false,
        kind: 'teacher' as const,
        look: {
          ...s.look,
          roleLabel: s.title || s.look.roleLabel,
        },
      }
    })
  }

  const rooms = allRooms(layout).filter(
    (r) => r.kind === 'classroom' || r.kind === 'office' || r.kind === 'gym'
  )
  return rooms.map((room, i) => {
    const real = teacherNameByRoom[room.roomId]?.trim()
    return {
      id: `teacher-${room.roomId}`,
      label: real || FALLBACK_TEACHER_NAMES[i % FALLBACK_TEACHER_NAMES.length]!,
      roomId: room.roomId,
      since,
      anonymized: false,
      kind: 'teacher' as const,
    }
  })
}

/**
 * Presence markers for the twin.
 * - Parents: only linked kids (real name + room). Never other minors.
 * - Staff/leadership: anonymized student markers (id kept for roster “here”);
 *   real names stay off the 3D labels — use enrollment counts instead.
 */
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

export function mergePresenceWithStaff(
  studentMarkers: CraftVisibleMarker[],
  layout: CraftCampusLayout,
  teacherNameByRoom: Record<string, string> = {}
): CraftVisibleMarker[] {
  const staff = staffMarkersForLayout(layout, teacherNameByRoom)
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
  const { role, teacherRoomIds, parentStudentIds } = ctx

  if (isLeadership(role)) {
    return {
      id: rec.studentId,
      label: 'Student',
      roomId: rec.roomId,
      since: rec.since,
      anonymized: true,
      kind: 'student',
    }
  }

  if (role === 'teacher') {
    if (!teacherRoomIds.includes(rec.roomId)) return null
    return {
      id: rec.studentId,
      label: 'Student',
      roomId: rec.roomId,
      since: rec.since,
      anonymized: true,
      kind: 'student',
    }
  }

  if (role === 'parent') {
    // Only linked children — real name + location. Never show other minors.
    if (!parentStudentIds.includes(rec.studentId)) return null
    return {
      id: rec.studentId,
      label: rec.studentName,
      roomId: rec.roomId,
      since: rec.since,
      anonymized: false,
      kind: 'student',
    }
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

/** Anonymize trail labels for shared admin screens (minors). */
export function anonymizeTrailsForDisplay(
  trails: { studentId: string; studentName: string; roomId: string; since: string }[]
): { studentId: string; studentName: string; roomId: string; since: string }[] {
  return trails.map((t) => ({
    ...t,
    studentName: 'Student',
  }))
}

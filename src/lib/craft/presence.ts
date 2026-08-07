import { isLeadership } from '@/lib/roles'
import type { Role } from '@/lib/types'
import type { CraftPresenceRecord, CraftVisibleMarker, CraftViewerContext } from './types'

export function canUseFlyMode(role: Role | null | undefined): boolean {
  return isLeadership(role)
}

export function canTriggerMockScans(role: Role | null | undefined): boolean {
  return isLeadership(role)
}

export function defaultAnonymizeForRole(role: Role): boolean {
  return role === 'parent'
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
      }
    }
    if (anonymizeOthers) {
      return {
        id: rec.studentId,
        label: 'Guest',
        roomId: rec.roomId,
        since: rec.since,
        anonymized: true,
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

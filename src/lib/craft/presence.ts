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

/** Fuzzy match a visible marker by display name (supports "easton berg", "berg", etc.). */
export function matchMarkerByName(
  markers: CraftVisibleMarker[],
  query: string
): CraftVisibleMarker | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined

  const tokens = q.split(/\s+/).filter(Boolean)
  const scored = markers
    .map((m) => {
      const label = m.label.toLowerCase()
      const exact = label === q
      const contains = label.includes(q)
      const tokenHit = tokens.every((t) => label.includes(t))
      const score = exact ? 100 : contains ? 50 : tokenHit ? 40 : 0
      return { marker: m, score }
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.marker
}

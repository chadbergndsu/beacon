import { createAdminClient } from '@/lib/supabase/admin'
import type { CraftTrailPoint } from './types'

/** Recent in-room scans for admin trail overlay (layout room IDs). */
export async function loadPresenceTrails(opts: {
  schoolId: string
  layoutToDbRoom: Record<string, string>
  dbToLayoutRoom: Record<string, string>
  limit?: number
}): Promise<CraftTrailPoint[]> {
  const { schoolId, layoutToDbRoom, dbToLayoutRoom, limit = 80 } = opts
  const dbRoomIds = Object.values(layoutToDbRoom)
  if (!dbRoomIds.length) return []

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('badge_scans')
    .select('student_id, room_id, direction, scanned_at')
    .eq('school_id', schoolId)
    .in('room_id', dbRoomIds)
    .eq('direction', 'in')
    .order('scanned_at', { ascending: false })
    .limit(limit)

  if (error || !data?.length) return []

  const studentIds = [...new Set(data.map((r) => r.student_id as string))]
  const { data: students } = await admin
    .from('students')
    .select('id, first_name, last_name')
    .in('id', studentIds)

  const names = new Map(
    (students ?? []).map((s) => [s.id as string, `${s.first_name} ${s.last_name}`])
  )

  return data
    .map((row) => {
      const dbRoomId = row.room_id as string
      const layoutRoomId = dbToLayoutRoom[dbRoomId]
      if (!layoutRoomId) return null
      const studentId = row.student_id as string
      return {
        studentId,
        studentName: names.get(studentId) || 'Student',
        roomId: layoutRoomId,
        since: row.scanned_at as string,
      }
    })
    .filter(Boolean) as CraftTrailPoint[]
}

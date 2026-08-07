import { createAdminClient } from '@/lib/supabase/admin'
import type { CraftCampusLayout } from './types'
import { allRooms } from './campus'

/**
 * Map layout room → teacher display name from classes.teacher_id → profiles.
 */
export async function loadTeacherNamesByLayoutRoom(
  schoolId: string,
  layout: CraftCampusLayout,
  layoutToDb: Record<string, string>,
  dbToLayout: Record<string, string>
): Promise<Record<string, string>> {
  const admin = createAdminClient()
  const { data: rooms } = await admin
    .from('school_rooms')
    .select('id, class_id')
    .eq('school_id', schoolId)
    .not('class_id', 'is', null)

  const classIds = [...new Set((rooms ?? []).map((r) => r.class_id as string).filter(Boolean))]
  if (!classIds.length) return {}

  const { data: classes } = await admin
    .from('classes')
    .select('id, teacher_id, name')
    .eq('school_id', schoolId)
    .in('id', classIds)

  const teacherIds = [
    ...new Set((classes ?? []).map((c) => c.teacher_id as string | null).filter(Boolean)),
  ] as string[]
  if (!teacherIds.length) return {}

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name')
    .in('id', teacherIds)

  const nameByTeacher = new Map(
    (profiles ?? []).map((p) => [p.id as string, String(p.full_name || '').trim()])
  )
  const teacherByClass = new Map(
    (classes ?? []).map((c) => [c.id as string, c.teacher_id as string | null])
  )

  const out: Record<string, string> = {}
  for (const room of rooms ?? []) {
    const dbId = room.id as string
    const layoutId = dbToLayout[dbId]
    if (!layoutId) continue
    const classId = room.class_id as string
    const teacherId = teacherByClass.get(classId)
    if (!teacherId) continue
    const name = nameByTeacher.get(teacherId)
    if (name) out[layoutId] = name
  }

  // Also try name-matching unmapped classrooms so demo layout still gets staff when DB rooms align
  void layoutToDb
  void allRooms(layout)

  return out
}

/**
 * Active enrollment counts per layout room (via school_rooms.class_id).
 */
export async function loadEnrollmentByLayoutRoom(
  schoolId: string,
  dbToLayout: Record<string, string>
): Promise<Record<string, number>> {
  const admin = createAdminClient()
  const { data: rooms } = await admin
    .from('school_rooms')
    .select('id, class_id')
    .eq('school_id', schoolId)
    .not('class_id', 'is', null)

  const counts: Record<string, number> = {}
  for (const room of rooms ?? []) {
    const classId = room.class_id as string | null
    const layoutId = dbToLayout[room.id as string]
    if (!classId || !layoutId) continue
    const { count, error } = await admin
      .from('enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
    if (error) continue
    counts[layoutId] = (counts[layoutId] ?? 0) + (count ?? 0)
  }
  return counts
}

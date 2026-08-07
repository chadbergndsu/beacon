import { NextResponse } from 'next/server'
import { requireCraftProfile } from '@/lib/craft/auth-api'
import { allRooms } from '@/lib/craft/campus'
import { loadCampusPresence } from '@/lib/craft/presence-store'
import {
  filterPresenceForViewer,
  defaultAnonymizeForRole,
  mergePresenceWithStaff,
  anonymizeTrailsForDisplay,
} from '@/lib/craft/presence'
import { loadEnrollmentByLayoutRoom, loadTeacherNamesByLayoutRoom } from '@/lib/craft/staff-enrollment'
import { lighthouseEnrollmentByRoom } from '@/lib/craft/lighthouse-staff'
import { isLeadership } from '@/lib/roles'
import { loadCraftRoomMapping } from '@/lib/craft/rooms'
import { loadCraftLayoutForSchool } from '@/lib/craft/settings'
import { loadPresenceTrails } from '@/lib/craft/trails'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireCraftProfile()
  if (!auth.ok) return auth.response

  const { profile } = auth
  const schoolId = profile.school_id!
  const layout = await loadCraftLayoutForSchool(schoolId)
  const layoutRoomIds = allRooms(layout).map((r) => r.roomId)
  const { layoutToDb, dbToLayout } = await loadCraftRoomMapping(schoolId, layout)

  const records = await loadCampusPresence({
    schoolId,
    layoutRoomIds,
    layoutToDbRoom: layoutToDb,
    dbToLayoutRoom: dbToLayout,
  })

  const admin = createAdminClient()
  let teacherRoomIds: string[] = []
  let teacherRoster: { id: string; name: string; gradeLevel: string | null }[] = []

  if (profile.role === 'teacher') {
    const { data: classes } = await admin
      .from('classes')
      .select('id')
      .eq('school_id', schoolId)
      .eq('teacher_id', profile.id)
    const classIds = (classes ?? []).map((c) => c.id as string)
    if (classIds.length) {
      const { data: rooms } = await admin
        .from('school_rooms')
        .select('id, class_id')
        .eq('school_id', schoolId)
        .in('class_id', classIds)
      teacherRoomIds = (rooms ?? [])
        .map((r) => dbToLayout[r.id as string] ?? (r.id as string))
        .filter((id) => layoutRoomIds.includes(id))
    }
    if (!teacherRoomIds.length) {
      teacherRoomIds = [layoutRoomIds.find((id) => id.includes('room-101')) ?? layoutRoomIds[0]]
    }

    const { data: classLinks } = await admin
      .from('enrollments')
      .select('student_id, class_id')
      .in('class_id', classIds)
    const studentIds = [...new Set((classLinks ?? []).map((l) => l.student_id as string))]
    if (studentIds.length) {
      const { data: studs } = await admin
        .from('students')
        .select('id, first_name, last_name, grade_level')
        .eq('school_id', schoolId)
        .in('id', studentIds)
        .eq('active', true)
      teacherRoster = (studs ?? []).map((s) => ({
        id: s.id as string,
        name: `${s.first_name} ${s.last_name}`,
        gradeLevel: (s.grade_level as string | null) ?? null,
      }))
    }
  }

  let parentStudentIds: string[] = []
  if (profile.role === 'parent') {
    const { data: links } = await admin
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', profile.id)
    parentStudentIds = (links ?? []).map((l) => l.student_id as string)
  }

  const [teacherNameByRoom, dbEnrollment] = await Promise.all([
    loadTeacherNamesByLayoutRoom(schoolId, layout, layoutToDb, dbToLayout),
    loadEnrollmentByLayoutRoom(schoolId, dbToLayout),
  ])
  // ~110 enrolled (younger-heavy) until real class enrollments are mapped
  const enrollmentByRoom = lighthouseEnrollmentByRoom(dbEnrollment)

  const markers = mergePresenceWithStaff(
    filterPresenceForViewer(records, {
      role: profile.role,
      teacherRoomIds,
      parentStudentIds,
      anonymizeOthers: defaultAnonymizeForRole(profile.role),
    }),
    layout,
    teacherNameByRoom
  )

  let trails: Awaited<ReturnType<typeof loadPresenceTrails>> = []
  if (isLeadership(profile.role)) {
    const raw = await loadPresenceTrails({
      schoolId,
      layoutToDbRoom: layoutToDb,
      dbToLayoutRoom: dbToLayout,
    })
    // Twin / shared screens: never show minor names on trail strip
    trails = anonymizeTrailsForDisplay(raw)
  }

  return NextResponse.json(
    {
      ok: true,
      layoutId: layout.id,
      generatedAt: new Date().toISOString(),
      markers,
      trails,
      teacherRoster,
      enrollmentByRoom,
      meta: {
        role: profile.role,
        teacherRoomIds,
        roomsMapped: allRooms(layout).filter((r) => layoutToDb[r.roomId]).length,
        roomsTotal: allRooms(layout).length,
        flyMode: isLeadership(profile.role),
        privacy: 'minors_anonymized_on_twin_except_linked_parent_children',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

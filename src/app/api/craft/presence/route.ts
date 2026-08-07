import { NextResponse } from 'next/server'
import { requireCraftProfile } from '@/lib/craft/auth-api'
import { DEMO_SCHOOL_LAYOUT } from '@/lib/craft/layout'
import { loadCampusPresence } from '@/lib/craft/presence-store'
import { filterPresenceForViewer, defaultAnonymizeForRole } from '@/lib/craft/presence'
import { isLeadership } from '@/lib/roles'
import { loadCraftRoomMapping } from '@/lib/craft/rooms'
import { loadPresenceTrails } from '@/lib/craft/trails'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireCraftProfile()
  if (!auth.ok) return auth.response

  const { profile } = auth
  const schoolId = profile.school_id!
  const layout = DEMO_SCHOOL_LAYOUT
  const layoutRoomIds = layout.rooms.map((r) => r.roomId)
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

  const markers = filterPresenceForViewer(records, {
    role: profile.role,
    teacherRoomIds,
    parentStudentIds,
    anonymizeOthers: defaultAnonymizeForRole(profile.role),
  })

  let trails: Awaited<ReturnType<typeof loadPresenceTrails>> = []
  if (isLeadership(profile.role)) {
    trails = await loadPresenceTrails({
      schoolId,
      layoutToDbRoom: layoutToDb,
      dbToLayoutRoom: dbToLayout,
    })
  }

  return NextResponse.json(
    {
      ok: true,
      layoutId: layout.id,
      generatedAt: new Date().toISOString(),
      markers,
      trails,
      teacherRoster,
      meta: {
        role: profile.role,
        teacherRoomIds,
        roomsMapped: layout.rooms.filter((r) => layoutToDb[r.roomId]).length,
        roomsTotal: layout.rooms.length,
        flyMode: isLeadership(profile.role),
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

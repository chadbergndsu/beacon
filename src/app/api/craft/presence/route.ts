import { NextResponse } from 'next/server'
import { requireCraftProfile } from '@/lib/craft/auth-api'
import {
  DEMO_SCHOOL_LAYOUT,
  buildRoomIdMap,
  invertRoomIdMap,
} from '@/lib/craft/layout'
import { loadCampusPresence } from '@/lib/craft/presence-store'
import { filterPresenceForViewer, defaultAnonymizeForRole } from '@/lib/craft/presence'
import { listRooms } from '@/lib/badge/store'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const auth = await requireCraftProfile()
  if (!auth.ok) return auth.response

  const { profile } = auth
  const schoolId = profile.school_id!
  const layout = DEMO_SCHOOL_LAYOUT
  const layoutRoomIds = layout.rooms.map((r) => r.roomId)

  let layoutToDb: Record<string, string> = {}
  try {
    const schoolRooms = await listRooms(schoolId)
    layoutToDb = buildRoomIdMap(layout, schoolRooms)
  } catch {
    layoutToDb = {}
  }
  const dbToLayout = invertRoomIdMap(layoutToDb)

  const records = await loadCampusPresence({
    schoolId,
    layoutRoomIds,
    layoutToDbRoom: layoutToDb,
    dbToLayoutRoom: dbToLayout,
  })

  let teacherRoomIds: string[] = []
  if (profile.role === 'teacher') {
    const admin = createAdminClient()
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
        .map((r) => {
          const dbId = r.id as string
          return dbToLayout[dbId] ?? dbId
        })
        .filter((id) => layoutRoomIds.includes(id))
    }
    if (!teacherRoomIds.length) {
      teacherRoomIds = [layoutRoomIds.find((id) => id.includes('room-101')) ?? layoutRoomIds[0]]
    }
  }

  let parentStudentIds: string[] = []
  if (profile.role === 'parent') {
    const admin = createAdminClient()
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

  return NextResponse.json(
    {
      ok: true,
      layoutId: layout.id,
      generatedAt: new Date().toISOString(),
      markers,
      meta: {
        role: profile.role,
        teacherRoomIds,
        flyMode: profile.role === 'admin' || profile.role === 'principal' || profile.role === 'staff',
      },
    },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

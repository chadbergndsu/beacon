import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSchoolStaff } from '@/lib/roles'
import {
  loadClassAssignments,
  loadClassRoster,
  loadGradesForAssignments,
} from '@/lib/gradebook-data'
import { loadAttendanceForClassDate } from '@/lib/attendance/store'
import { TeacherQuickMode } from '@/components/teacher/TeacherQuickMode'
import type { Grade } from '@/lib/types'

export default async function TeacherQuickPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>
}) {
  const { profile, user } = await getProfile()
  if (!profile || !isSchoolStaff(profile.role)) {
    redirect('/dashboard')
  }

  const params = await searchParams
  const admin = createAdminClient()
  const role = profile.role
  const schoolId = profile.school_id

  let classRows: {
    id: string
    name: string
    subject: string | null
    teacher_id: string | null
  }[] = []

  if (role === 'teacher') {
    const { data } = await admin
      .from('classes')
      .select('id, name, subject, teacher_id')
      .eq('teacher_id', user.id)
      .eq('active', true)
      .order('name')
    classRows = data ?? []
  } else {
    if (schoolId) {
      const { data } = await admin
        .from('classes')
        .select('id, name, subject, teacher_id')
        .eq('active', true)
        .eq('school_id', schoolId)
        .order('name')
      classRows = data ?? []
    } else {
      classRows = []
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  const bundles: Record<
    string,
    {
      students: Awaited<ReturnType<typeof loadClassRoster>>
      assignments: Awaited<ReturnType<typeof loadClassAssignments>>
      grades: Grade[]
      attendance: Awaited<ReturnType<typeof loadAttendanceForClassDate>>
      today: string
    }
  > = {}

  const classes = await Promise.all(
    classRows.map(async (c) => {
      const [students, assignments, attendance] = await Promise.all([
        loadClassRoster(c.id),
        loadClassAssignments(c.id),
        loadAttendanceForClassDate(c.id, today),
      ])
      const grades = await loadGradesForAssignments(assignments.map((a) => a.id))
      bundles[c.id] = {
        students,
        assignments,
        grades,
        attendance,
        today,
      }
      return {
        id: c.id,
        name: c.name,
        subject: c.subject,
        studentCount: students.length,
      }
    })
  )

  const initialClassId =
    params.class && classes.some((c) => c.id === params.class)
      ? params.class
      : classes[0]?.id ?? null

  return (
    <TeacherQuickMode
      classes={classes}
      bundles={bundles}
      initialClassId={initialClassId}
    />
  )
}

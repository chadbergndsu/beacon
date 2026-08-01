import { createAdminClient } from '@/lib/supabase/admin'
import { listAllPulses } from '@/lib/school-modules/store'
import { calculateTransparentGrade } from '@/lib/grades'
import { buildBeaconSignal } from '@/lib/insights/beacon-signal'
import type { Assignment, Grade, GradeCategory } from '@/lib/types'
import type { AttendanceRecord as AttRec } from '@/lib/attendance/types'

/**
 * Aggregate school climate for principal Beacon Signal.
 */
export async function loadSchoolBeaconSignal(schoolId: string) {
  const admin = createAdminClient()

  const [{ data: students }, pulses] = await Promise.all([
    admin
      .from('students')
      .select('id, first_name, last_name, grade_level')
      .eq('school_id', schoolId)
      .eq('active', true),
    listAllPulses(schoolId),
  ])

  const studentNames = new Map(
    (students ?? []).map((s) => [
      s.id,
      {
        name: `${s.first_name} ${s.last_name}`,
        gradeLevel: s.grade_level as string | null,
      },
    ])
  )

  // Attendance last 14 days from table (best-effort)
  const since = new Date()
  since.setDate(since.getDate() - 14)
  const sinceStr = since.toISOString().slice(0, 10)
  let attendance: AttRec[] = []
  const { data: attRows, error: attErr } = await admin
    .from('attendance')
    .select('*')
    .eq('school_id', schoolId)
    .gte('date', sinceStr)

  if (!attErr && attRows) {
    attendance = attRows.map((r) => ({
      id: String(r.id),
      schoolId: String(r.school_id),
      classId: String(r.class_id),
      studentId: String(r.student_id),
      date: String(r.date),
      status: r.status as AttRec['status'],
      note: (r.note as string) || undefined,
      markedBy: (r.marked_by as string) || undefined,
    }))
  }

  // Missing work pressure (sample active classes)
  const { data: classes } = await admin
    .from('classes')
    .select('id')
    .eq('school_id', schoolId)
    .eq('active', true)

  const missingByStudent = new Map<string, number>()
  for (const c of classes ?? []) {
    const [{ data: categories }, { data: assignmentsData }, { data: enrolls }] =
      await Promise.all([
        admin.from('grade_categories').select('*').eq('class_id', c.id),
        admin.from('assignments').select('*').eq('class_id', c.id),
        admin.from('enrollments').select('student_id').eq('class_id', c.id),
      ])
    const assignments = (assignmentsData ?? []) as Assignment[]
    if (!assignments.length) continue
    const ids = assignments.map((a) => a.id)
    const { data: gradeRows } = await admin
      .from('grades')
      .select('*')
      .in('assignment_id', ids)
    const grades = (gradeRows ?? []) as Grade[]
    const cats = (categories ?? []) as GradeCategory[]

    for (const e of enrolls ?? []) {
      const studentGrades = grades.filter((g) => g.student_id === e.student_id)
      const result = calculateTransparentGrade(cats, assignments, studentGrades)
      if (result.missingCount > 0) {
        missingByStudent.set(
          e.student_id,
          (missingByStudent.get(e.student_id) || 0) + result.missingCount
        )
      }
    }
  }

  return buildBeaconSignal({
    studentCount: students?.length ?? 0,
    pulses,
    attendance,
    missingByStudent,
    studentNames,
  })
}

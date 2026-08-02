import { createAdminClient } from '@/lib/supabase/admin'
import {
  classifyStudentWork,
  rollupClassMissing,
  type ClassMissingRollup,
  type MissingWorkSummary,
} from '@/lib/insights/missing-work'
import type { Assignment, Grade } from '@/lib/types'

export async function loadMissingWorkForStudent(
  studentId: string,
  studentName: string
): Promise<MissingWorkSummary> {
  const admin = createAdminClient()
  const { data: enrollments } = await admin
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId)
  const classIds = (enrollments ?? []).map((e) => e.class_id)
  if (!classIds.length) {
    return classifyStudentWork({
      studentId,
      studentName,
      classes: [],
    })
  }

  const { data: classRows } = await admin
    .from('classes')
    .select('id, name')
    .in('id', classIds)

  const classes: {
    classId: string
    className: string
    assignments: Assignment[]
    grades: Grade[]
  }[] = []

  for (const c of classRows ?? []) {
    const { data: assignmentsData } = await admin
      .from('assignments')
      .select('*')
      .eq('class_id', c.id)
    const assignments = (assignmentsData ?? []) as Assignment[]
    if (!assignments.length) {
      classes.push({ classId: c.id, className: c.name, assignments: [], grades: [] })
      continue
    }
    const ids = assignments.map((a) => a.id)
    const { data: gradeRows } = await admin
      .from('grades')
      .select('*')
      .eq('student_id', studentId)
      .in('assignment_id', ids)
    classes.push({
      classId: c.id,
      className: c.name,
      assignments,
      grades: (gradeRows ?? []) as Grade[],
    })
  }

  return classifyStudentWork({ studentId, studentName, classes })
}

export async function loadMissingWorkForParentChildren(
  children: { id: string; first_name: string; last_name: string }[]
): Promise<MissingWorkSummary[]> {
  return Promise.all(
    children.map((c) =>
      loadMissingWorkForStudent(c.id, `${c.first_name} ${c.last_name}`)
    )
  )
}

export async function loadTeacherClassMissing(
  classId: string,
  className: string
): Promise<ClassMissingRollup> {
  const admin = createAdminClient()
  const { data: enrolls } = await admin
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)
  const studentIds = (enrolls ?? []).map((e) => e.student_id)
  if (!studentIds.length) {
    return rollupClassMissing(classId, className, [], [], [])
  }

  const [{ data: students }, { data: assignmentsData }] = await Promise.all([
    admin.from('students').select('id, first_name, last_name').in('id', studentIds),
    admin.from('assignments').select('*').eq('class_id', classId),
  ])

  const assignments = (assignmentsData ?? []) as Assignment[]
  const ids = assignments.map((a) => a.id)
  let grades: Grade[] = []
  if (ids.length) {
    const { data } = await admin.from('grades').select('*').in('assignment_id', ids)
    grades = (data ?? []) as Grade[]
  }

  const roster = (students ?? []).map((s) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
  }))

  return rollupClassMissing(classId, className, roster, assignments, grades)
}

export async function loadTeacherToday(classIds: { id: string; name: string }[]) {
  const rollups = await Promise.all(
    classIds.map((c) => loadTeacherClassMissing(c.id, c.name))
  )
  const totalMissingStudents = rollups.reduce((n, r) => n + r.studentsWithMissing, 0)
  const totalMissingItems = rollups.reduce((n, r) => n + r.totalMissingItems, 0)
  return {
    rollups,
    totalMissingStudents,
    totalMissingItems,
    classesWithPressure: rollups.filter((r) => r.totalMissingItems > 0).length,
  }
}

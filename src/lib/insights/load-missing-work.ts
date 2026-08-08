import { createAdminClient } from '@/lib/supabase/admin'
import {
  classifyStudentWork,
  rollupClassMissing,
  type ClassMissingRollup,
  type MissingWorkSummary,
} from '@/lib/insights/missing-work'
import type { Assignment, Grade } from '@/lib/types'
import { measureServerOperation } from '@/lib/ops/server-performance'

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
  children: { id: string; first_name: string; last_name: string }[],
  schoolId: string
): Promise<MissingWorkSummary[]> {
  return measureServerOperation('parent.missing_work', async () => {
    if (children.length === 0) return []

    const admin = createAdminClient()
    const studentIds = children.map((child) => child.id)
    const { data: enrollmentRows } = await admin
      .from('enrollments')
      .select('student_id, class_id')
      .in('student_id', studentIds)

    const enrollments = (enrollmentRows ?? []) as Array<{
      student_id: string
      class_id: string
    }>
    const classIds = [...new Set(enrollments.map((row) => row.class_id))]
    if (classIds.length === 0) {
      return children.map((child) =>
        classifyStudentWork({
          studentId: child.id,
          studentName: `${child.first_name} ${child.last_name}`,
          classes: [],
        })
      )
    }

    const { data: classRows } = await admin
      .from('classes')
      .select('id, name')
      .in('id', classIds)
      .eq('school_id', schoolId)
    const classes = (classRows ?? []) as Array<{ id: string; name: string }>
    const allowedClassIds = new Set(classes.map((row) => row.id))
    const scopedClassIds = [...allowedClassIds]

    const { data: assignmentRows } = scopedClassIds.length
      ? await admin
          .from('assignments')
          .select('*')
          .in('class_id', scopedClassIds)
      : { data: [] }
    const assignments = (assignmentRows ?? []) as Assignment[]
    const assignmentIds = assignments.map((assignment) => assignment.id)

    const { data: gradeRows } = assignmentIds.length
      ? await admin
          .from('grades')
          .select('*')
          .in('assignment_id', assignmentIds)
          .in('student_id', studentIds)
      : { data: [] }
    const grades = (gradeRows ?? []) as Grade[]

    const assignmentsByClass = new Map<string, Assignment[]>()
    for (const assignment of assignments) {
      const current = assignmentsByClass.get(assignment.class_id) ?? []
      current.push(assignment)
      assignmentsByClass.set(assignment.class_id, current)
    }
    const classById = new Map(classes.map((row) => [row.id, row]))

    return children.map((child) => {
      const childClassIds = [
        ...new Set(
          enrollments
            .filter((row) => row.student_id === child.id && allowedClassIds.has(row.class_id))
            .map((row) => row.class_id)
        ),
      ]
      return classifyStudentWork({
        studentId: child.id,
        studentName: `${child.first_name} ${child.last_name}`,
        classes: childClassIds.flatMap((classId) => {
          const classRow = classById.get(classId)
          if (!classRow) return []
          return [
            {
              classId,
              className: classRow.name,
              assignments: assignmentsByClass.get(classId) ?? [],
              grades,
            },
          ]
        }),
      })
    })
  })
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

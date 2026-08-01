import { createAdminClient } from '@/lib/supabase/admin'
import { calculateTransparentGrade } from '@/lib/grades'
import { listPulsesForStudent } from '@/lib/school-modules/store'
import { loadAttendanceForStudent } from '@/lib/attendance/store'
import type { Assignment, Grade, GradeCategory } from '@/lib/types'
import {
  buildDinnerTableDigest,
  type ClassSnapshot,
} from '@/lib/insights/dinner-table'
import {
  buildConferenceBrief,
  type ConferenceClassRow,
} from '@/lib/insights/conference-brief'

export async function loadStudentClassSnapshots(studentId: string): Promise<{
  classes: ClassSnapshot[]
  conferenceClasses: ConferenceClassRow[]
}> {
  const admin = createAdminClient()
  const { data: enrollments } = await admin
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId)
  const classIds = (enrollments ?? []).map((e) => e.class_id)

  if (!classIds.length) {
    return { classes: [], conferenceClasses: [] }
  }

  const { data: classRows } = await admin
    .from('classes')
    .select('id, name, subject, term, teacher_id')
    .in('id', classIds)
    .order('name')

  const classes: ClassSnapshot[] = []
  const conferenceClasses: ConferenceClassRow[] = []

  for (const c of classRows ?? []) {
    const [{ data: categories }, { data: assignmentsData }] = await Promise.all([
      admin.from('grade_categories').select('*').eq('class_id', c.id),
      admin.from('assignments').select('*').eq('class_id', c.id),
    ])
    const assignments = (assignmentsData ?? []) as Assignment[]
    const cats = (categories ?? []) as GradeCategory[]
    const ids = assignments.map((a) => a.id)
    let grades: Grade[] = []
    if (ids.length) {
      const { data } = await admin
        .from('grades')
        .select('*')
        .eq('student_id', studentId)
        .in('assignment_id', ids)
      grades = (data ?? []) as Grade[]
    }
    const result = calculateTransparentGrade(cats, assignments, grades)
    classes.push({
      className: c.name,
      subject: c.subject,
      result,
    })
    conferenceClasses.push({
      className: c.name,
      subject: c.subject,
      result,
    })
  }

  return { classes, conferenceClasses }
}

export async function buildStudentDinnerAndConference(
  student: {
    id: string
    school_id: string
    first_name: string
    last_name: string
    grade_level: string | null
  }
) {
  const name = `${student.first_name} ${student.last_name}`
  const [{ classes, conferenceClasses }, pulses, attendance] = await Promise.all([
    loadStudentClassSnapshots(student.id),
    listPulsesForStudent(student.school_id, student.id),
    loadAttendanceForStudent(student.id, 60),
  ])

  const dinner = buildDinnerTableDigest({
    studentName: name,
    gradeLevel: student.grade_level,
    classes,
    pulses,
    attendance,
  })

  const conference = buildConferenceBrief({
    studentName: name,
    gradeLevel: student.grade_level,
    classes: conferenceClasses,
    pulses,
    attendance,
  })

  return { name, dinner, conference, pulses, classes }
}

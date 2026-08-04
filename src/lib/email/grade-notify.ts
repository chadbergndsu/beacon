import { createAdminClient } from '@/lib/supabase/admin'
import { calculateTransparentGrade } from '@/lib/grades'
import { queueAndSendBatch } from '@/lib/email/send'
import {
  appBaseUrl,
  gradeNoticeBodies,
  subjectTag,
} from '@/lib/email/templates'
import { resolveParentsForStudents } from '@/lib/email/recipients'
import { loadSchoolBrand } from '@/lib/school-brand'
import type { Assignment, Grade, GradeCategory } from '@/lib/types'

/**
 * Email linked parents for students whose grades were just saved.
 * Uses transparent overall % so parents see the same math as the app.
 */
export async function notifyParentsOfGradeSave(opts: {
  classId: string
  schoolId: string
  className: string
  studentIds: string[]
}): Promise<{ sent: number; note?: string }> {
  if (!opts.studentIds.length) return { sent: 0 }

  const admin = createAdminClient()
  const brand = await loadSchoolBrand(opts.schoolId)
  const tag = subjectTag(brand)
  const base = appBaseUrl()

  const [{ data: categories }, { data: assignmentsData }, { data: students }] =
    await Promise.all([
      admin.from('grade_categories').select('*').eq('class_id', opts.classId),
      admin.from('assignments').select('*').eq('class_id', opts.classId),
      admin
        .from('students')
        .select('id, first_name, last_name')
        .in('id', opts.studentIds),
    ])

  const assignments = (assignmentsData ?? []) as Assignment[]
  const cats = (categories ?? []) as GradeCategory[]
  const assignmentIds = assignments.map((a) => a.id)

  const { data: allGrades } = assignmentIds.length
    ? await admin
        .from('grades')
        .select('*')
        .in('assignment_id', assignmentIds)
        .in('student_id', opts.studentIds)
    : { data: [] as Grade[] }

  const grades = (allGrades ?? []) as Grade[]
  const parentsMap = await resolveParentsForStudents(opts.studentIds)

  if (![...parentsMap.values()].some((v) => v.length)) {
    return { sent: 0, note: 'No parent links for updated students.' }
  }

  type Out = Parameters<typeof queueAndSendBatch>[0][number]
  const batch: Out[] = []

  for (const student of students ?? []) {
    const studentGrades = grades.filter((g) => g.student_id === student.id)
    const result = calculateTransparentGrade(cats, assignments, studentGrades)
    const overall =
      result.overall != null
        ? `${result.overall}% (${result.letter || '—'})`
        : 'Not enough scores yet'
    const studentName = `${student.first_name} ${student.last_name}`

    for (const parent of parentsMap.get(student.id) || []) {
      const { text, html } = gradeNoticeBodies({
        brand,
        parentName: parent.name || 'Parent',
        studentName,
        className: opts.className,
        overall,
        formula: result.formula,
        appUrl: `${base}/students/${student.id}`,
      })
      batch.push({
        school_id: opts.schoolId,
        kind: 'grade_notice',
        to_email: parent.email,
        to_name: parent.name,
        subject: `[${tag}] Grade update: ${student.first_name} in ${opts.className}`,
        body_text: text,
        body_html: html,
        related_table: 'classes',
        related_id: opts.classId,
        meta: {
          student_id: student.id,
          overall: result.overall,
          letter: result.letter,
        },
      })
    }
  }

  if (!batch.length) return { sent: 0, note: 'No parent emails to notify.' }

  const r = await queueAndSendBatch(batch, { brand })
  return {
    sent: r.sent,
    note:
      r.sent === 0 && r.skipped > 0
        ? 'Email not live (log-only) — parents not emailed.'
        : r.note,
  }
}

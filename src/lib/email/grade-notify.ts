import { createAdminClient } from '@/lib/supabase/admin'
import { calculateTransparentGrade } from '@/lib/grades'
import { queueAndSendEmail } from '@/lib/email/send'
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

  const { data: links } = await admin
    .from('parent_students')
    .select('parent_id, student_id')
    .in('student_id', opts.studentIds)

  if (!links?.length) {
    return { sent: 0, note: 'No parent links for updated students.' }
  }

  const parentIds = [...new Set(links.map((l) => l.parent_id))]
  const { data: parents } = await admin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', parentIds)

  const parentById = new Map((parents ?? []).map((p) => [p.id, p]))
  let sent = 0
  let note: string | undefined

  for (const student of students ?? []) {
    const studentGrades = grades.filter((g) => g.student_id === student.id)
    const result = calculateTransparentGrade(cats, assignments, studentGrades)
    const overall =
      result.overall != null ? `${result.overall}% (${result.letter || '—'})` : 'Not enough scores yet'

    const parentLinks = links.filter((l) => l.student_id === student.id)
    for (const link of parentLinks) {
      const parent = parentById.get(link.parent_id)
      if (!parent?.email) continue

      const subject = `Grade update: ${student.first_name} in ${opts.className}`
      const body_text = [
        `Hello ${parent.full_name || 'Parent'},`,
        '',
        `Grades were updated for ${student.first_name} ${student.last_name} in ${opts.className}.`,
        '',
        `Current overall: ${overall}`,
        '',
        result.formula,
        '',
        'Open Beacon to see the full transparent breakdown.',
        '',
        '— Beacon system notice',
      ].join('\n')

      const r = await queueAndSendEmail({
        school_id: opts.schoolId,
        kind: 'grade_notice',
        to_email: parent.email,
        to_name: parent.full_name,
        subject: `[Beacon] ${subject}`,
        body_text,
        body_html: `
          <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5">
            <p style="color:#0369a1;font-size:12px;text-transform:uppercase;letter-spacing:.06em">Beacon · Grade notice</p>
            <p>Hello ${escape(parent.full_name || 'Parent')},</p>
            <p>Grades were updated for <strong>${escape(student.first_name)} ${escape(student.last_name)}</strong> in <strong>${escape(opts.className)}</strong>.</p>
            <p style="font-size:22px;font-weight:700;margin:16px 0">Current overall: ${escape(overall)}</p>
            <p style="font-family:ui-monospace,monospace;font-size:13px;background:#f8fafc;padding:12px;border-radius:8px">${escape(result.formula)}</p>
            <p style="color:#64748b;font-size:13px">Open Beacon to see the full transparent breakdown.</p>
            <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0" />
            <p style="color:#94a3b8;font-size:12px">System email from Beacon. Do not reply.</p>
          </div>
        `,
        related_table: 'classes',
        related_id: opts.classId,
        meta: { student_id: student.id, overall: result.overall, letter: result.letter },
      })
      if (r.status === 'sent' || r.status === 'skipped') sent++
      if (r.status === 'skipped' && !note) {
        note = 'Grade notices logged (set RESEND_API_KEY to deliver).'
      }
    }
  }

  return { sent, note }
}

function escape(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

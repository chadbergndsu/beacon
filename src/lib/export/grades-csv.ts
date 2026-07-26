import type { Assignment, Grade, Student } from '@/lib/types'

export function buildGradesCsv(
  className: string,
  students: Student[],
  assignments: Assignment[],
  grades: Grade[]
): string {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? '' : String(v)
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }

  const headers = [
    'Student Last',
    'Student First',
    'Grade Level',
    ...assignments.map((a) => `${a.title} (${a.max_points})`),
  ]

  const lines = [headers.map(escape).join(',')]

  for (const s of students) {
    const row = [s.last_name, s.first_name, s.grade_level ?? '']
    for (const a of assignments) {
      const g = grades.find(
        (x) => x.student_id === s.id && x.assignment_id === a.id
      )
      if (!g) row.push('')
      else if (g.is_missing) row.push('M')
      else row.push(g.score == null ? '' : String(g.score))
    }
    lines.push(row.map(escape).join(','))
  }

  lines.unshift(`# ${className} — Beacon export`)
  return lines.join('\n') + '\n'
}

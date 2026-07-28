import { calculateTransparentGrade } from '@/lib/grades'
import type { Assignment, Grade, GradeCategory, Student } from '@/lib/types'
import type { PulseEntry } from '@/lib/school-modules/types'
import type { AttendanceRecord } from '@/lib/attendance/types'
import { PULSE_LEVEL_LABEL } from '@/lib/school-modules/types'

export type ReportCardClass = {
  className: string
  subject: string | null
  term: string | null
  overall: number | null
  letter: string | null
  formula: string
  breakdown: { name: string; weight: number; average: number | null }[]
}

export type ReportCardData = {
  student: Student
  schoolName: string
  generatedAt: string
  classes: ReportCardClass[]
  pulseSummary: { strong: number; steady: number; needs_care: number; latestNote?: string }
  attendanceSummary: { present: number; absent: number; tardy: number; excused: number }
}

export function buildReportCard(input: {
  student: Student
  schoolName: string
  classBlocks: {
    className: string
    subject: string | null
    term: string | null
    categories: GradeCategory[]
    assignments: Assignment[]
    grades: Grade[]
  }[]
  pulses: PulseEntry[]
  attendance: AttendanceRecord[]
}): ReportCardData {
  const classes: ReportCardClass[] = input.classBlocks.map((b) => {
    const result = calculateTransparentGrade(b.categories, b.assignments, b.grades)
    return {
      className: b.className,
      subject: b.subject,
      term: b.term,
      overall: result.overall,
      letter: result.letter,
      formula: result.formula,
      breakdown: result.breakdown.map((x) => ({
        name: x.name,
        weight: x.weight,
        average: x.average,
      })),
    }
  })

  const pulseSummary = { strong: 0, steady: 0, needs_care: 0, latestNote: undefined as string | undefined }
  for (const p of input.pulses) {
    pulseSummary[p.overall]++
  }
  if (input.pulses[0]?.celebrate) {
    pulseSummary.latestNote = input.pulses[0].celebrate
  } else if (input.pulses[0]) {
    pulseSummary.latestNote = `Latest pulse: ${PULSE_LEVEL_LABEL[input.pulses[0].overall]}`
  }

  const attendanceSummary = { present: 0, absent: 0, tardy: 0, excused: 0 }
  for (const a of input.attendance) {
    attendanceSummary[a.status]++
  }

  return {
    student: input.student,
    schoolName: input.schoolName,
    generatedAt: new Date().toISOString(),
    classes,
    pulseSummary,
    attendanceSummary,
  }
}

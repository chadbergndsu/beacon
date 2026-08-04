/**
 * Weekly (or custom-range) test/quiz score sheets for send-home parent signature.
 * Pure helpers — no DB. Teachers pick which scored items to include so incomplete
 * grading never sneaks onto Friday's packet.
 */

export type ScoreReportAssignment = {
  id: string
  title: string
  dueDate: string | null // YYYY-MM-DD
  maxPoints: number
  categoryName: string | null
}

export type ScoreReportGrade = {
  assignmentId: string
  studentId: string
  score: number | null
  isMissing: boolean
}

export type ScoreReportStudent = {
  id: string
  firstName: string
  lastName: string
  gradeLevel: string | null
}

export type StudentScoreRow = {
  assignmentId: string
  title: string
  dueDate: string | null
  maxPoints: number
  categoryName: string | null
  score: number | null
  isMissing: boolean
  pct: number | null
  display: string
}

const TEST_QUIZ_RE = /\b(test|tests|quiz|quizzes|exam|exams|assessment|assessments)\b/i

/** True when category or title looks like a test/quiz (not everyday homework). */
export function isTestOrQuiz(
  categoryName: string | null | undefined,
  title: string
): boolean {
  if (categoryName && TEST_QUIZ_RE.test(categoryName)) return true
  if (TEST_QUIZ_RE.test(title)) return true
  return false
}

/** Inclusive YYYY-MM-DD range on due_date. Null due dates excluded unless includeUndated. */
export function inDateRange(
  dueDate: string | null | undefined,
  from: string,
  to: string,
  includeUndated = false
): boolean {
  if (!dueDate) return includeUndated
  return dueDate >= from && dueDate <= to
}

function toYmd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

/**
 * School week Mon–Fri containing `ref` (local). Friday send-home for "this week"
 * covers Mon through Fri of that week.
 */
export function schoolWeekRange(ref: Date = new Date()): { from: string; to: string } {
  const day = startOfLocalDay(ref)
  const dow = day.getDay() // 0 Sun … 6 Sat
  const daysFromMonday = dow === 0 ? 6 : dow - 1
  const monday = new Date(day)
  monday.setDate(day.getDate() - daysFromMonday)
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  return { from: toYmd(monday), to: toYmd(friday) }
}

export function previousSchoolWeekRange(ref: Date = new Date()): {
  from: string
  to: string
} {
  const thisWeek = schoolWeekRange(ref)
  const mon = new Date(thisWeek.from + 'T12:00:00')
  mon.setDate(mon.getDate() - 7)
  return schoolWeekRange(mon)
}

/** Next calendar Monday after `ref` — typical "return by Monday" after Friday send-home. */
export function nextMondayYmd(ref: Date = new Date()): string {
  const day = startOfLocalDay(ref)
  const dow = day.getDay()
  const add = dow === 0 ? 1 : dow === 1 ? 7 : 8 - dow
  const mon = new Date(day)
  mon.setDate(day.getDate() + add)
  return toYmd(mon)
}

export function formatScoreDisplay(
  score: number | null,
  maxPoints: number,
  isMissing: boolean
): string {
  if (isMissing) return 'Missing'
  if (score === null || score === undefined) return '—'
  const max = maxPoints > 0 ? maxPoints : 100
  const pct = Math.round((Number(score) / max) * 1000) / 10
  return `${score}/${max} (${pct}%)`
}

export function scorePct(
  score: number | null,
  maxPoints: number,
  isMissing: boolean
): number | null {
  if (isMissing || score === null || score === undefined) return null
  const max = maxPoints > 0 ? maxPoints : 100
  return Math.round((Number(score) / max) * 1000) / 10
}

export type Completeness = {
  gradedCount: number
  total: number
  /** Every student has a grade row with a score or marked missing. */
  complete: boolean
}

/** How fully graded an assignment is across the roster. */
export function assignmentCompleteness(
  assignmentId: string,
  studentIds: string[],
  grades: ScoreReportGrade[]
): Completeness {
  const total = studentIds.length
  if (total === 0) {
    return { gradedCount: 0, total: 0, complete: false }
  }
  let gradedCount = 0
  for (const sid of studentIds) {
    const g = grades.find(
      (x) => x.assignmentId === assignmentId && x.studentId === sid
    )
    if (!g) continue
    if (g.isMissing || g.score !== null) gradedCount++
  }
  return {
    gradedCount,
    total,
    complete: gradedCount === total,
  }
}

export function filterTestQuizInRange(
  assignments: ScoreReportAssignment[],
  from: string,
  to: string,
  options?: { includeUndated?: boolean; onlyTestQuiz?: boolean }
): ScoreReportAssignment[] {
  const onlyTestQuiz = options?.onlyTestQuiz !== false
  const includeUndated = Boolean(options?.includeUndated)
  return assignments
    .filter((a) => {
      if (onlyTestQuiz && !isTestOrQuiz(a.categoryName, a.title)) return false
      return inDateRange(a.dueDate, from, to, includeUndated)
    })
    .sort((a, b) => {
      const da = a.dueDate || '9999'
      const db = b.dueDate || '9999'
      if (da !== db) return da.localeCompare(db)
      return a.title.localeCompare(b.title)
    })
}

/**
 * Default selection: tests/quizzes in range that are fully graded.
 * Incomplete items stay off so Friday spelling (not entered yet) never prints.
 */
export function defaultSelectedAssignmentIds(
  candidates: ScoreReportAssignment[],
  studentIds: string[],
  grades: ScoreReportGrade[]
): string[] {
  return candidates
    .filter((a) => assignmentCompleteness(a.id, studentIds, grades).complete)
    .map((a) => a.id)
}

export function buildStudentScoreRows(
  studentId: string,
  selected: ScoreReportAssignment[],
  grades: ScoreReportGrade[]
): StudentScoreRow[] {
  return selected.map((a) => {
    const g = grades.find(
      (x) => x.assignmentId === a.id && x.studentId === studentId
    )
    const isMissing = Boolean(g?.isMissing)
    const score = g && !isMissing ? g.score : isMissing ? null : (g?.score ?? null)
    const pct = scorePct(score, a.maxPoints, isMissing)
    return {
      assignmentId: a.id,
      title: a.title,
      dueDate: a.dueDate,
      maxPoints: a.maxPoints,
      categoryName: a.categoryName,
      score: isMissing ? null : score,
      isMissing,
      pct,
      display: formatScoreDisplay(
        isMissing ? null : score,
        a.maxPoints,
        isMissing
      ),
    }
  })
}

export function formatDisplayDate(ymd: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd
  const d = new Date(ymd + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function studentDisplayName(s: ScoreReportStudent): string {
  return `${s.lastName}, ${s.firstName}`.trim()
}

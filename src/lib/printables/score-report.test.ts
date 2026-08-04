import { describe, expect, it } from 'vitest'
import {
  assignmentCompleteness,
  buildStudentScoreRows,
  defaultSelectedAssignmentIds,
  filterTestQuizInRange,
  formatScoreDisplay,
  inDateRange,
  isTestOrQuiz,
  nextMondayYmd,
  previousSchoolWeekRange,
  schoolWeekRange,
} from './score-report'

describe('isTestOrQuiz', () => {
  it('matches category names', () => {
    expect(isTestOrQuiz('Tests', 'Chapter 4')).toBe(true)
    expect(isTestOrQuiz('Quizzes', 'Spelling')).toBe(true)
    expect(isTestOrQuiz('Homework', 'Worksheet 3')).toBe(false)
  })

  it('matches titles when category is generic', () => {
    expect(isTestOrQuiz('Graded work', 'Friday spelling test')).toBe(true)
    expect(isTestOrQuiz(null, 'Unit 2 Quiz')).toBe(true)
    expect(isTestOrQuiz(null, 'Reading log')).toBe(false)
  })
})

describe('inDateRange', () => {
  it('is inclusive on due dates', () => {
    expect(inDateRange('2026-08-03', '2026-08-03', '2026-08-07')).toBe(true)
    expect(inDateRange('2026-08-07', '2026-08-03', '2026-08-07')).toBe(true)
    expect(inDateRange('2026-08-02', '2026-08-03', '2026-08-07')).toBe(false)
  })

  it('excludes undated by default', () => {
    expect(inDateRange(null, '2026-08-03', '2026-08-07')).toBe(false)
    expect(inDateRange(null, '2026-08-03', '2026-08-07', true)).toBe(true)
  })
})

describe('schoolWeekRange', () => {
  it('returns Mon–Fri for a Wednesday', () => {
    // 2026-08-05 is a Wednesday
    const r = schoolWeekRange(new Date(2026, 7, 5))
    expect(r.from).toBe('2026-08-03')
    expect(r.to).toBe('2026-08-07')
  })

  it('previous week is prior Mon–Fri', () => {
    const r = previousSchoolWeekRange(new Date(2026, 7, 5))
    expect(r.from).toBe('2026-07-27')
    expect(r.to).toBe('2026-07-31')
  })
})

describe('nextMondayYmd', () => {
  it('from Friday returns the following Monday', () => {
    // 2026-08-07 Friday
    expect(nextMondayYmd(new Date(2026, 7, 7))).toBe('2026-08-10')
  })
})

describe('formatScoreDisplay', () => {
  it('shows missing, blank, and score with pct', () => {
    expect(formatScoreDisplay(null, 100, true)).toBe('Missing')
    expect(formatScoreDisplay(null, 100, false)).toBe('—')
    expect(formatScoreDisplay(18, 20, false)).toBe('18/20 (90%)')
  })
})

describe('assignmentCompleteness + default selection', () => {
  const students = ['s1', 's2']
  const assignments = [
    {
      id: 'a1',
      title: 'Spelling test',
      dueDate: '2026-08-07',
      maxPoints: 20,
      categoryName: 'Tests',
    },
    {
      id: 'a2',
      title: 'Math quiz',
      dueDate: '2026-08-05',
      maxPoints: 10,
      categoryName: 'Quizzes',
    },
    {
      id: 'a3',
      title: 'Reading log',
      dueDate: '2026-08-06',
      maxPoints: 5,
      categoryName: 'Homework',
    },
  ]
  const grades = [
    { assignmentId: 'a2', studentId: 's1', score: 9, isMissing: false },
    { assignmentId: 'a2', studentId: 's2', score: 10, isMissing: false },
    // Friday spelling only half graded — must not auto-select
    { assignmentId: 'a1', studentId: 's1', score: 18, isMissing: false },
  ]

  it('marks incomplete when any student lacks a grade', () => {
    const c = assignmentCompleteness('a1', students, grades)
    expect(c.complete).toBe(false)
    expect(c.gradedCount).toBe(1)
    expect(assignmentCompleteness('a2', students, grades).complete).toBe(true)
  })

  it('filters tests/quizzes in range and defaults only complete ones', () => {
    const candidates = filterTestQuizInRange(assignments, '2026-08-03', '2026-08-07')
    expect(candidates.map((a) => a.id)).toEqual(['a2', 'a1'])
    expect(defaultSelectedAssignmentIds(candidates, students, grades)).toEqual(['a2'])
  })

  it('builds per-student rows for selected items only', () => {
    const selected = [assignments[1]]
    const rows = buildStudentScoreRows('s1', selected, grades)
    expect(rows).toHaveLength(1)
    expect(rows[0].display).toBe('9/10 (90%)')
  })
})

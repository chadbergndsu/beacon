import { describe, expect, it } from 'vitest'
import { classifyStudentWork, rollupClassMissing } from './missing-work'
import type { Assignment, Grade } from '@/lib/types'

const a = (id: string, title: string, due: string | null): Assignment => ({
  id,
  class_id: 'c1',
  category_id: null,
  title,
  max_points: 10,
  due_date: due,
  is_extra_credit: false,
})

describe('classifyStudentWork', () => {
  it('treats past-due unscored work as missing and future as upcoming', () => {
    const summary = classifyStudentWork({
      studentId: 's1',
      studentName: 'Ava',
      now: new Date('2026-07-28T12:00:00Z'),
      classes: [
        {
          classId: 'c1',
          className: 'Math',
          assignments: [
            a('a1', 'Quiz 1', '2026-07-20'),
            a('a2', 'Quiz 2', '2026-08-10'),
            a('a3', 'HW', null),
          ],
          grades: [
            {
              assignment_id: 'a1',
              student_id: 's1',
              score: null,
              is_missing: true,
            } as Grade,
          ],
        },
      ],
    })

    expect(summary.missingCount).toBe(2) // past due + no due
    expect(summary.upcomingCount).toBe(1)
    expect(summary.upcoming[0].title).toBe('Quiz 2')
  })

  it('ignores scored work', () => {
    const summary = classifyStudentWork({
      studentId: 's1',
      studentName: 'Ava',
      now: new Date('2026-07-28T12:00:00Z'),
      classes: [
        {
          classId: 'c1',
          className: 'Math',
          assignments: [a('a1', 'Quiz', '2026-07-01')],
          grades: [
            {
              assignment_id: 'a1',
              student_id: 's1',
              score: 9,
              is_missing: false,
            } as Grade,
          ],
        },
      ],
    })
    expect(summary.missingCount).toBe(0)
  })
})

describe('rollupClassMissing', () => {
  it('ranks students by missing count', () => {
    const rollup = rollupClassMissing(
      'c1',
      'Math',
      [
        { id: 's1', name: 'Ava' },
        { id: 's2', name: 'Ben' },
      ],
      [a('a1', 'Q1', '2026-07-01'), a('a2', 'Q2', '2026-07-02')],
      [
        { assignment_id: 'a1', student_id: 's1', score: 10, is_missing: false },
      ] as Grade[],
      new Date('2026-07-28')
    )
    expect(rollup.studentsWithMissing).toBe(2)
    expect(rollup.topStudents[0].studentId).toBe('s2') // 2 missing
  })
})

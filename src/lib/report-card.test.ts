import { describe, expect, it } from 'vitest'
import { buildReportCard } from './report-card'
import type { Student } from './types'

const student: Student = {
  id: 's1',
  school_id: 'sch',
  first_name: 'Emma',
  last_name: 'Johnson',
  grade_level: '5',
}

describe('buildReportCard', () => {
  it('aggregates class grades and summaries', () => {
    const report = buildReportCard({
      student,
      schoolName: 'LCA',
      classBlocks: [
        {
          className: 'Math',
          subject: 'Math',
          term: '2025-2026',
          categories: [
            { id: 'c1', class_id: 'c', name: 'Tests', weight: 100, drop_lowest: 0 },
          ],
          assignments: [
            {
              id: 'a1',
              class_id: 'c',
              category_id: 'c1',
              title: 'T1',
              max_points: 100,
              is_extra_credit: false,
            },
          ],
          grades: [
            { assignment_id: 'a1', student_id: 's1', score: 92, is_missing: false },
          ],
        },
      ],
      pulses: [
        {
          id: 'p1',
          classId: 'c',
          studentId: 's1',
          teacherId: 't',
          teacherName: 'Teacher',
          date: '2026-01-01',
          overall: 'strong',
          dimensions: {},
          note: '',
          celebrate: 'Great attitude',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
      attendance: [
        {
          id: 'a',
          schoolId: 'sch',
          classId: 'c',
          studentId: 's1',
          date: '2026-01-02',
          status: 'present',
        },
      ],
    })

    expect(report.classes[0].overall).toBe(92)
    expect(report.classes[0].letter).toBe('A-')
    expect(report.pulseSummary.strong).toBe(1)
    expect(report.pulseSummary.latestNote).toContain('Great attitude')
    expect(report.attendanceSummary.present).toBe(1)
  })
})

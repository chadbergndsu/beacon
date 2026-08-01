import { describe, expect, it } from 'vitest'
import { buildConferenceBrief } from './conference-brief'
import type { TransparentResult } from '@/lib/types'

const result = (overall: number, missing = 0): TransparentResult => ({
  overall,
  letter: overall >= 90 ? 'A' : 'C',
  breakdown: [
    {
      name: 'Tests',
      weight: 50,
      average: overall,
      contribution: overall * 0.5,
      count: 2,
      dropped: 0,
    },
  ],
  formula: 'Tests 50%',
  missingCount: missing,
})

describe('buildConferenceBrief', () => {
  it('produces talking points and next steps', () => {
    const brief = buildConferenceBrief({
      studentName: 'Noah',
      gradeLevel: '7',
      classes: [
        { className: 'Bible', result: result(96) },
        { className: 'History', result: result(71, 1) },
      ],
      pulses: [
        {
          id: 'p1',
          classId: 'c',
          studentId: 's',
          teacherId: 't',
          teacherName: 'Coach',
          date: '2026-07-20',
          overall: 'needs_care',
          dimensions: { peer: 'needs_care' },
          note: 'Quiet at recess',
          createdAt: '2026-07-20T15:00:00.000Z',
        },
      ],
      attendance: [
        {
          id: 'a1',
          schoolId: 'sch',
          classId: 'c',
          studentId: 's',
          date: '2026-07-18',
          status: 'absent',
        },
      ],
    })

    expect(brief.studentName).toBe('Noah')
    expect(brief.talkingPoints.length).toBeGreaterThan(0)
    expect(brief.nextSteps.some((s) => s.toLowerCase().includes('missing') || s.includes('History'))).toBe(
      true
    )
    expect(brief.familyWins.some((w) => w.includes('Bible'))).toBe(true)
    expect(brief.pulseSummary.careNotes.length).toBeGreaterThan(0)
  })
})

import { describe, expect, it } from 'vitest'
import { buildDinnerTableDigest } from './dinner-table'
import type { TransparentResult } from '@/lib/types'

const emptyResult = (overall: number | null, missing = 0): TransparentResult => ({
  overall,
  letter: overall == null ? null : overall >= 90 ? 'A' : overall >= 80 ? 'B' : 'C',
  breakdown: [],
  formula: 'weighted',
  missingCount: missing,
})

describe('buildDinnerTableDigest', () => {
  it('builds celebrate / watch / conversation starters for parents', () => {
    const digest = buildDinnerTableDigest({
      studentName: 'Ava Smith',
      gradeLevel: '4',
      classes: [
        { className: 'Math', result: emptyResult(94) },
        { className: 'Science', result: emptyResult(68, 2) },
      ],
      pulses: [
        {
          id: '1',
          classId: 'c1',
          studentId: 's1',
          teacherId: 't1',
          teacherName: 'Mrs. Lee',
          date: new Date().toISOString().slice(0, 10),
          overall: 'strong',
          dimensions: { joy: 'strong' },
          note: '',
          celebrate: 'Led chapel song with confidence',
          createdAt: new Date().toISOString(),
        },
      ],
      attendance: [],
    })

    expect(digest.studentName).toBe('Ava Smith')
    expect(digest.celebrate.some((c) => c.includes('chapel') || c.includes('Math'))).toBe(true)
    expect(digest.watch.some((w) => w.includes('Science'))).toBe(true)
    expect(digest.comingUp.some((c) => c.includes('missing'))).toBe(true)
    expect(digest.conversationStarters.length).toBeGreaterThanOrEqual(2)
    expect(digest.gradesLine).toContain('Math')
  })
})

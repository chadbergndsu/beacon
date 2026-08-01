import { describe, expect, it } from 'vitest'
import { buildBeaconSignal } from './beacon-signal'

describe('buildBeaconSignal', () => {
  it('scores climate and ranks a watch list', () => {
    const missing = new Map<string, number>([
      ['s1', 4],
      ['s2', 0],
    ])
    const names = new Map([
      ['s1', { name: 'Ava', gradeLevel: '4' }],
      ['s2', { name: 'Ben', gradeLevel: '4' }],
    ])

    const signal = buildBeaconSignal({
      studentCount: 20,
      pulses: [
        {
          id: '1',
          classId: 'c',
          studentId: 's1',
          teacherId: 't',
          teacherName: 'Mrs. A',
          date: new Date().toISOString().slice(0, 10),
          overall: 'needs_care',
          dimensions: {},
          note: 'Withdrawn',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          classId: 'c',
          studentId: 's2',
          teacherId: 't',
          teacherName: 'Mrs. A',
          date: new Date().toISOString().slice(0, 10),
          overall: 'strong',
          dimensions: {},
          note: '',
          createdAt: new Date().toISOString(),
        },
      ],
      attendance: [],
      missingByStudent: missing,
      studentNames: names,
    })

    expect(signal.score).toBeLessThan(100)
    expect(['thriving', 'steady', 'watch', 'urgent']).toContain(signal.level)
    expect(signal.watchList.some((w) => w.studentId === 's1')).toBe(true)
    expect(signal.metrics.pulseCareCount).toBe(1)
    expect(signal.headline.length).toBeGreaterThan(5)
  })
})

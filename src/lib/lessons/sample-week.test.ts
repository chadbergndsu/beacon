import { describe, expect, it } from 'vitest'
import { buildSampleWeek, SAMPLE_CLASSES } from './sample-week'
import { startOfWeekMonday, weekDayIsos, formatWeekRange } from './week-dates'

describe('sample week', () => {
  it('builds Mon–Fri plans for every sample class', () => {
    const { classes, plans, weekMonday } = buildSampleWeek(new Date('2025-10-08T12:00:00'))
    expect(classes.length).toBe(SAMPLE_CLASSES.length)
    expect(weekMonday.getDay()).toBe(1)
    const days = weekDayIsos(weekMonday)
    expect(days).toHaveLength(5)
    for (const c of classes) {
      const forClass = plans.filter((p) => p.classId === c.id)
      expect(forClass).toHaveLength(5)
      expect(forClass.map((p) => p.date).sort()).toEqual([...days].sort())
    }
    expect(plans.some((p) => /Elijah/i.test(p.unit || ''))).toBe(true)
    expect(plans.some((p) => /Lesson 36/i.test(p.unit || ''))).toBe(true)
    expect(plans.some((p) => /Through the Seasons/i.test(p.unit || ''))).toBe(true)
  })

  it('formats a readable week range', () => {
    const monday = startOfWeekMonday(new Date('2025-10-08T12:00:00'))
    expect(formatWeekRange(monday)).toMatch(/Oct/)
  })
})

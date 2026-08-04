import { describe, expect, it } from 'vitest'
import {
  coreSubjectsForGrade,
  suggestClassName,
  subjectsForGrade,
} from './abeka'

describe('abeka catalog', () => {
  it('filters subjects by grade band', () => {
    const k5 = subjectsForGrade('K5').map((s) => s.id)
    expect(k5).toContain('phonics')
    expect(k5).not.toContain('algebra1')

    const g10 = subjectsForGrade('10').map((s) => s.id)
    expect(g10).toContain('biology')
    expect(g10).not.toContain('phonics')
  })

  it('suggests class names', () => {
    expect(suggestClassName('5', { id: 'bible', short: 'Bible' })).toBe('5th Grade Bible')
    expect(suggestClassName('3', { id: 'homeroom', short: 'Homeroom' })).toBe(
      '3rd Grade Homeroom'
    )
  })

  it('has core slate for elementary', () => {
    const core = coreSubjectsForGrade('4')
    expect(core.some((s) => s.id === 'homeroom' || s.id === 'bible')).toBe(true)
  })
})

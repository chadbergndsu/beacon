import { describe, expect, it } from 'vitest'
import { schoolToday } from './school-day'

describe('schoolToday', () => {
  it('returns YYYY-MM-DD', () => {
    expect(schoolToday('UTC')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(schoolToday('America/Chicago')).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

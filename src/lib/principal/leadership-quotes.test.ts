import { describe, expect, it } from 'vitest'
import {
  CHRIS_COWAN_LEADERSHIP_QUOTES,
  leadershipQuoteForDate,
} from './leadership-quotes'

describe('leadershipQuoteForDate', () => {
  it('returns a quote from the library for Chris Cowan', () => {
    const q = leadershipQuoteForDate(new Date('2026-08-07T12:00:00Z'))
    expect(CHRIS_COWAN_LEADERSHIP_QUOTES).toContain(q.text)
    expect(q.author).toBe('Chris Cowan')
    expect(q.label).toBe('Leadership quote of the day')
  })

  it('is stable for the same UTC day', () => {
    const a = leadershipQuoteForDate(new Date('2026-08-07T08:00:00Z'))
    const b = leadershipQuoteForDate(new Date('2026-08-07T22:00:00Z'))
    expect(a.text).toBe(b.text)
  })
})

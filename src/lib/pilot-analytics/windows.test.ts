import { describe, expect, it } from 'vitest'
import {
  baselineDay,
  buildHelpfulnessMetric,
  buildRatioMetric,
  isBaselinePeriod,
  isoWeekStart,
  trailingWindow,
  utcDateKey,
} from './windows'

describe('UTC date windows', () => {
  it('uses the UTC calendar day at a day boundary', () => {
    expect(utcDateKey(new Date('2026-08-09T23:59:59Z'))).toBe('2026-08-09')
    expect(utcDateKey(new Date('2026-08-10T00:00:00Z'))).toBe('2026-08-10')
  })

  it('starts ISO weeks on Monday in UTC', () => {
    expect(isoWeekStart(new Date('2026-08-09T23:59:59Z'))).toBe('2026-08-03')
    expect(isoWeekStart(new Date('2026-08-10T00:00:00Z'))).toBe('2026-08-10')
  })

  it('includes today and the preceding six UTC days in a trailing seven-day window', () => {
    expect(trailingWindow(new Date('2026-08-10T00:00:00Z'), 7)).toEqual({
      start: '2026-08-04',
      end: '2026-08-10',
    })
  })
})

describe('baseline window', () => {
  it('treats the first 28 UTC calendar days from activity as baseline', () => {
    expect(isBaselinePeriod('2026-08-01', new Date('2026-08-28T23:59:59Z'))).toBe(true)
    expect(isBaselinePeriod('2026-08-01', new Date('2026-08-29T00:00:00Z'))).toBe(false)
  })

  it('returns a one-based baseline day only during the baseline', () => {
    expect(baselineDay('2026-08-01', new Date('2026-08-01T00:00:00Z'))).toBe(1)
    expect(baselineDay('2026-08-01', new Date('2026-08-28T23:59:59Z'))).toBe(28)
    expect(baselineDay('2026-08-01', new Date('2026-08-29T00:00:00Z'))).toBeNull()
    expect(baselineDay(null, new Date('2026-08-01T00:00:00Z'))).toBeNull()
  })
})

describe('ratio metrics', () => {
  it('keeps zero eligible users distinct from a zero-percent ready metric', () => {
    expect(buildRatioMetric({ active: 0, eligible: 0 })).toMatchObject({ state: 'no_eligible' })
    expect(buildRatioMetric({ active: 0, eligible: 8 })).toMatchObject({ state: 'ready', percent: 0 })
  })

  it('rounds a ready ratio percentage from real counts', () => {
    expect(buildRatioMetric({ active: 2, eligible: 3 })).toEqual({
      state: 'ready',
      active: 2,
      eligible: 3,
      percent: 67,
    })
  })

  it('preserves unavailable activity or eligibility data', () => {
    expect(buildRatioMetric({ active: null, eligible: 8 })).toMatchObject({ state: 'unavailable' })
    expect(buildRatioMetric({ active: 2, eligible: null })).toMatchObject({ state: 'unavailable' })
  })

  it('rejects negative ratio counts', () => {
    expect(() => buildRatioMetric({ active: -1, eligible: 8 })).toThrow()
    expect(() => buildRatioMetric({ active: 1, eligible: -8 })).toThrow()
  })
})

describe('helpfulness metrics', () => {
  it('suppresses helpfulness percentages until at least five responses', () => {
    expect(buildHelpfulnessMetric({ helpful: 4, total: 4 })).toMatchObject({ state: 'small_sample' })
    expect(buildHelpfulnessMetric({ helpful: 4, total: 5 })).toMatchObject({ state: 'ready', percent: 80 })
  })

  it('keeps zero feedback as a small sample rather than a percentage', () => {
    expect(buildHelpfulnessMetric({ helpful: 0, total: 0 })).toEqual({
      state: 'small_sample',
      helpful: 0,
      total: 0,
      minimum: 5,
    })
  })

  it('preserves unavailable feedback data', () => {
    expect(buildHelpfulnessMetric({ helpful: null, total: 5 })).toMatchObject({ state: 'unavailable' })
    expect(buildHelpfulnessMetric({ helpful: 4, total: null })).toMatchObject({ state: 'unavailable' })
  })

  it('rejects negative helpfulness counts', () => {
    expect(() => buildHelpfulnessMetric({ helpful: -1, total: 5 })).toThrow()
    expect(() => buildHelpfulnessMetric({ helpful: 1, total: -5 })).toThrow()
  })
})

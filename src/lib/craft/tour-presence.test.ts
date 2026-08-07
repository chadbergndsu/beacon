import { describe, expect, it } from 'vitest'
import { TOUR_DEMO_MARKERS } from './tour-presence'

describe('TOUR_DEMO_MARKERS', () => {
  it('uses anonymized labels only', () => {
    expect(TOUR_DEMO_MARKERS.length).toBeGreaterThan(0)
    for (const m of TOUR_DEMO_MARKERS) {
      expect(m.anonymized).toBe(true)
      expect(m.label).not.toMatch(/berg|@/i)
    }
  })
})

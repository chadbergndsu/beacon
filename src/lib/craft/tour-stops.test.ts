import { describe, expect, it } from 'vitest'
import { DEMO_SCHOOL_LAYOUT, getRoomById } from './layout'
import { TOUR_STOPS } from './tour-stops'

describe('TOUR_STOPS', () => {
  it('points at rooms that exist in the demo layout', () => {
    expect(TOUR_STOPS.length).toBeGreaterThanOrEqual(4)
    for (const stop of TOUR_STOPS) {
      expect(getRoomById(DEMO_SCHOOL_LAYOUT, stop.roomId)).toBeTruthy()
    }
  })
})

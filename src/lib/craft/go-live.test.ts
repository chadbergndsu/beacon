import { describe, expect, it } from 'vitest'
import { evaluateCraftReadiness } from './go-live'

describe('evaluateCraftReadiness', () => {
  it('requires all rooms mapped and verification', () => {
    expect(
      evaluateCraftReadiness({
        roomsMapped: 7,
        roomsTotal: 7,
        hasBadgeActivity: true,
        smokeTestDone: false,
      }).ready
    ).toBe(true)

    expect(
      evaluateCraftReadiness({
        roomsMapped: 7,
        roomsTotal: 7,
        hasBadgeActivity: false,
        smokeTestDone: true,
      }).ready
    ).toBe(true)

    expect(
      evaluateCraftReadiness({
        roomsMapped: 5,
        roomsTotal: 7,
        hasBadgeActivity: true,
        smokeTestDone: false,
      }).ready
    ).toBe(false)

    expect(
      evaluateCraftReadiness({
        roomsMapped: 7,
        roomsTotal: 7,
        hasBadgeActivity: false,
        smokeTestDone: false,
      }).ready
    ).toBe(false)
  })
})

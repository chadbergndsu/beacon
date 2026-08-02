import { describe, expect, it } from 'vitest'
import { isParentPilotReady } from './onboarding'

describe('isParentPilotReady', () => {
  it('requires brand + students + classes + parent links', () => {
    expect(
      isParentPilotReady({ brandOk: true, students: 1, classes: 1, parentLinks: 1 })
    ).toBe(true)
    expect(
      isParentPilotReady({ brandOk: false, students: 10, classes: 5, parentLinks: 5 })
    ).toBe(false)
    expect(
      isParentPilotReady({ brandOk: true, students: 0, classes: 1, parentLinks: 1 })
    ).toBe(false)
  })
})

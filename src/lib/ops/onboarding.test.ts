import { describe, expect, it } from 'vitest'
import {
  PARENT_PILOT_APPROVAL_CHECKS,
  isBadgeKioskReady,
  isParentPilotReady,
  summarizeOnboardingSteps,
  type OnboardingStep,
} from './onboarding'

describe('isBadgeKioskReady', () => {
  const completeSetup = {
    roomCount: 1,
    badgeCount: 1,
    kioskToken: 'valid-kiosk-token',
    kioskExpiresAt: '2026-08-08T12:00:00.000Z',
    now: Date.parse('2026-08-07T12:00:00.000Z'),
  }

  it('requires rooms, a student badge code, and an unexpired kiosk link', () => {
    expect(isBadgeKioskReady(completeSetup)).toBe(true)
    expect(isBadgeKioskReady({ ...completeSetup, roomCount: 0 })).toBe(false)
    expect(isBadgeKioskReady({ ...completeSetup, badgeCount: 0 })).toBe(false)
    expect(isBadgeKioskReady({ ...completeSetup, kioskToken: 'short' })).toBe(false)
    expect(
      isBadgeKioskReady({
        ...completeSetup,
        kioskExpiresAt: '2026-08-06T12:00:00.000Z',
      })
    ).toBe(false)
  })
})

describe('summarizeOnboardingSteps', () => {
  const step = (
    id: string,
    category: OnboardingStep['category'],
    done: boolean
  ): OnboardingStep => ({
    id,
    category,
    done,
    label: id,
    href: '/',
    detail: id,
  })

  it('keeps optional modules out of the core readiness score', () => {
    const summary = summarizeOnboardingSteps([
      step('students', 'core', true),
      step('teachers', 'core', true),
      step('badges', 'optional', false),
      step('craft', 'optional', false),
    ])

    expect(summary.core).toMatchObject({ complete: 2, total: 2, percent: 100 })
    expect(summary.optional).toMatchObject({ complete: 0, total: 2, percent: 0 })
    expect(summary.core.steps.map(({ id }) => id)).toEqual(['students', 'teachers'])
  })

  it('reports incomplete core setup independently of enabled optional modules', () => {
    const summary = summarizeOnboardingSteps([
      step('students', 'core', true),
      step('teachers', 'core', false),
      step('craft', 'optional', true),
    ])

    expect(summary.core.percent).toBe(50)
    expect(summary.optional.percent).toBe(100)
  })
})

describe('isParentPilotReady', () => {
  const approvedChecklist = Object.fromEntries(
    PARENT_PILOT_APPROVAL_CHECKS.map((id) => [id, true])
  )

  it('approves only when the ordered path and every trust check are complete', () => {
    expect(
      isParentPilotReady({ pilotPathComplete: true, checklist: approvedChecklist })
    ).toBe(true)
    expect(
      isParentPilotReady({ pilotPathComplete: false, checklist: approvedChecklist })
    ).toBe(false)
  })

  it.each(PARENT_PILOT_APPROVAL_CHECKS)('fails closed when %s is incomplete', (missing) => {
    expect(
      isParentPilotReady({
        pilotPathComplete: true,
        checklist: { ...approvedChecklist, [missing]: false },
      })
    ).toBe(false)
  })
})

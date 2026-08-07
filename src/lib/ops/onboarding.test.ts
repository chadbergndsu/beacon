import { describe, expect, it } from 'vitest'
import { PARENT_PILOT_APPROVAL_CHECKS, isParentPilotReady } from './onboarding'

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

import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requirePrincipal: vi.fn(),
  listPilotFeedback: vi.fn(),
  listParentExperienceFeedbackForLeadership: vi.fn(),
}))

vi.mock('@/lib/principal', () => ({ requirePrincipal: mocks.requirePrincipal }))
vi.mock('@/lib/pilot-feedback/store', () => ({
  listPilotFeedback: mocks.listPilotFeedback,
}))
vi.mock('@/lib/pilot-analytics/parent-feedback', () => ({
  listParentExperienceFeedbackForLeadership:
    mocks.listParentExperienceFeedbackForLeadership,
}))

import PrincipalFeedbackPage from './page'

describe('PrincipalFeedbackPage', () => {
  it('loads both feedback inboxes for the school authorized by requirePrincipal', async () => {
    mocks.requirePrincipal.mockResolvedValue({ schoolId: 'school-authorized' })
    mocks.listPilotFeedback.mockResolvedValue([])
    mocks.listParentExperienceFeedbackForLeadership.mockResolvedValue([])

    await expect(PrincipalFeedbackPage()).resolves.toBeTruthy()
    expect(mocks.requirePrincipal).toHaveBeenCalledTimes(1)
    expect(mocks.listPilotFeedback).toHaveBeenCalledWith('school-authorized')
    expect(mocks.listParentExperienceFeedbackForLeadership).toHaveBeenCalledWith(
      'school-authorized'
    )
  })
})

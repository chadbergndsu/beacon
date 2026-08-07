import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

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
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads both feedback inboxes for the school authorized by requirePrincipal', async () => {
    mocks.requirePrincipal.mockResolvedValue({ schoolId: 'school-authorized' })
    mocks.listPilotFeedback.mockResolvedValue([])
    mocks.listParentExperienceFeedbackForLeadership.mockResolvedValue({
      state: 'ready',
      items: [],
    })

    const html = renderToStaticMarkup(await PrincipalFeedbackPage())

    expect(html).toContain('No parent comments yet.')
    expect(mocks.requirePrincipal).toHaveBeenCalledTimes(1)
    expect(mocks.listPilotFeedback).toHaveBeenCalledWith('school-authorized')
    expect(mocks.listParentExperienceFeedbackForLeadership).toHaveBeenCalledWith(
      'school-authorized'
    )
  })

  it('renders ready parent comments from the authorized school', async () => {
    mocks.requirePrincipal.mockResolvedValue({ schoolId: 'school-authorized' })
    mocks.listPilotFeedback.mockResolvedValue([])
    mocks.listParentExperienceFeedbackForLeadership.mockResolvedValue({
      state: 'ready',
      items: [
        {
          id: 'feedback-1',
          rating: 'helpful',
          comment: 'The weekly view helped.',
          created_at: '2026-08-07T14:00:00.000Z',
        },
      ],
    })

    const html = renderToStaticMarkup(await PrincipalFeedbackPage())

    expect(html).toContain('The weekly view helped.')
    expect(html).not.toContain('Temporarily unavailable')
  })

  it('renders unavailable instead of a false empty state when parent comments fail', async () => {
    mocks.requirePrincipal.mockResolvedValue({ schoolId: 'school-authorized' })
    mocks.listPilotFeedback.mockResolvedValue([])
    mocks.listParentExperienceFeedbackForLeadership.mockResolvedValue({
      state: 'unavailable',
      reason: 'Parent comments are temporarily unavailable.',
    })

    const html = renderToStaticMarkup(await PrincipalFeedbackPage())

    expect(html).toContain('Temporarily unavailable')
    expect(html).not.toContain('No parent comments yet.')
  })
})

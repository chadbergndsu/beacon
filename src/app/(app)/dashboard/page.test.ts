import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Children, type ReactElement, type ReactNode } from 'react'
import { createMockAdmin } from '@/lib/test/mock-supabase'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  recordPilotActivity: vi.fn(),
  loadScreenLayout: vi.fn(),
  feedbackQueries: [] as Array<{ columns: string; filters: Record<string, unknown> }>,
  feedbackResult: {
    data: { rating: 'helpful', comment: 'A useful week.' },
    error: null,
  } as { data: unknown; error: unknown },
  feedbackPromise: null as Promise<{ data: unknown; error: unknown }> | null,
  loaderStarts: [] as string[],
  admin: null as ReturnType<typeof createMockAdmin> | null,
}))

vi.mock('@/lib/auth', () => ({ getProfile: mocks.getProfile }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mocks.admin) throw new Error('admin mock not set')
    return mocks.admin
  },
}))
vi.mock('@/lib/pilot-analytics/activity', () => ({
  recordPilotActivity: mocks.recordPilotActivity,
}))
vi.mock('@/lib/view-prefs/store', () => ({ loadScreenLayout: mocks.loadScreenLayout }))

import DashboardPage from './page'

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  email: null,
}

function sessionClient() {
  return {
    from(table: string) {
      const query = { columns: '', filters: {} as Record<string, unknown> }
      return {
        select(columns: string) {
          expect(table).toBe('parent_experience_feedback')
          query.columns = columns
          return this
        },
        eq(column: string, value: unknown) {
          query.filters[column] = value
          return this
        },
        async maybeSingle() {
          mocks.feedbackQueries.push(query)
          return mocks.feedbackPromise ?? mocks.feedbackResult
        },
      }
    },
  }
}

describe('parent dashboard pilot activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.feedbackQueries = []
    mocks.feedbackPromise = null
    mocks.loaderStarts = []
    mocks.feedbackResult = {
      data: { rating: 'helpful', comment: 'A useful week.' },
      error: null,
    }
    mocks.admin = createMockAdmin({
      parent_students: () => {
        mocks.loaderStarts.push('children')
        return { data: [], error: null }
      },
      announcements: () => {
        mocks.loaderStarts.push('announcements')
        return { data: [], error: null }
      },
    })
    mocks.getProfile.mockResolvedValue({
      user,
      profile: {
        id: user.id,
        school_id: 'school-1',
        role: 'parent',
        full_name: 'Pat Parent',
        email: null,
        phone: null,
      },
      supabase: sessionClient(),
    })
    mocks.recordPilotActivity.mockResolvedValue({ recorded: true })
    mocks.loadScreenLayout.mockResolvedValue([])
  })

  it('records a verified parent dashboard render', async () => {
    const page = await DashboardPage()

    expect(page).toBeTruthy()
    expect(mocks.recordPilotActivity).toHaveBeenCalledWith({
      schoolId: 'school-1',
      userId: user.id,
      actorRole: 'parent',
      eventType: 'parent_portal',
    })
  })

  it('loads only the signed-in parent current-week response and registers the card', async () => {
    await DashboardPage()

    expect(mocks.feedbackQueries).toEqual([
      {
        columns: 'rating, comment',
        filters: {
          parent_id: user.id,
          school_id: 'school-1',
          surface: 'parent_dashboard',
          week_start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        },
      },
    ])
    expect(mocks.loadScreenLayout).toHaveBeenCalledWith(
      user.id,
      'dashboard',
      expect.arrayContaining(['parent_feedback'])
    )
  })

  it('starts independent parent loaders before activity or feedback finishes', async () => {
    let finishActivity!: (value: { recorded: boolean }) => void
    let finishFeedback!: (value: { data: unknown; error: unknown }) => void
    mocks.recordPilotActivity.mockReturnValue(
      new Promise((resolve) => {
        finishActivity = resolve
      })
    )
    mocks.feedbackPromise = new Promise((resolve) => {
      finishFeedback = resolve
    })

    const pagePromise = DashboardPage()

    try {
      await vi.waitFor(() => {
        expect(mocks.feedbackQueries).toHaveLength(1)
        expect(mocks.loaderStarts).toEqual(
          expect.arrayContaining(['children', 'announcements'])
        )
        expect(mocks.loadScreenLayout).toHaveBeenCalledTimes(1)
      })
    } finally {
      finishActivity({ recorded: true })
      finishFeedback(mocks.feedbackResult)
    }

    await expect(pagePromise).resolves.toBeTruthy()
  })

  it('keeps the dashboard and exposes an unavailable card when the response query fails', async () => {
    mocks.feedbackResult = { data: null, error: { message: 'offline' } }

    const page = (await DashboardPage()) as ReactElement<{ children: ReactNode }>
    const sections = Children.toArray(page.props.children) as ReactElement<{
      id?: string
      children?: ReactElement<{ unavailable?: boolean }>
    }>[]
    const feedbackSection = sections.find((section) => section.props.id === 'parent_feedback')

    expect(feedbackSection?.props.children?.props.unavailable).toBe(true)
    expect(mocks.recordPilotActivity).toHaveBeenCalledTimes(1)
  })

  it('still renders the parent dashboard when activity recording reports failure', async () => {
    mocks.recordPilotActivity.mockResolvedValue({ recorded: false })

    await expect(DashboardPage()).resolves.toBeTruthy()
  })

  it('does not record dashboard activity for non-parent roles', async () => {
    mocks.getProfile.mockResolvedValue({
      user,
      profile: {
        id: user.id,
        school_id: 'school-1',
        role: 'staff',
        full_name: 'Staff User',
        email: null,
        phone: null,
      },
      supabase: {},
    })

    await expect(DashboardPage()).resolves.toBeTruthy()
    expect(mocks.recordPilotActivity).not.toHaveBeenCalled()
  })
})

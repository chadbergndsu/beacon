import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAdmin } from '@/lib/test/mock-supabase'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  recordPilotActivity: vi.fn(),
  loadScreenLayout: vi.fn(),
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

describe('parent dashboard pilot activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.admin = createMockAdmin({
      parent_students: () => ({ data: [], error: null }),
      announcements: () => ({ data: [], error: null }),
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
      supabase: {},
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

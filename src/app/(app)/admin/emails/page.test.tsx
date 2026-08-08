import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  profile: {
    id: '22222222-2222-4222-8222-222222222222',
    school_id: '11111111-1111-4111-8111-111111111111',
    role: 'teacher',
    email: 'teacher@school.test',
  },
  listEmailOutbox: vi.fn(),
  getEmailDeliveryStats: vi.fn(),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/components/comms/CommunicationsComposer', () => ({ CommunicationsComposer: vi.fn(() => null) }))
vi.mock('@/lib/auth', () => ({
  getProfile: vi.fn(async () => ({ profile: mocks.profile, user: { id: mocks.profile.id } })),
}))
vi.mock('@/lib/email/send', () => ({
  listEmailOutbox: mocks.listEmailOutbox,
  getEmailDeliveryStats: mocks.getEmailDeliveryStats,
  isEmailLive: vi.fn(() => false),
}))
vi.mock('@/lib/school-brand', () => ({
  loadSchoolBrand: vi.fn(async () => ({ name: 'School', shortName: 'School', email: null })),
}))
vi.mock('@/lib/roles', () => ({ canSendSystemEmail: vi.fn(() => false) }))
vi.mock('@/lib/notify/slack', () => ({ isSlackConfigured: vi.fn(() => false), slackConfigMode: vi.fn(() => null) }))
vi.mock('@/lib/view-prefs/store', () => ({ loadScreenLayout: vi.fn(async () => []) }))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => {
      const chain: Record<string, unknown> = {}
      for (const name of ['select', 'eq', 'order']) chain[name] = vi.fn(() => chain)
      chain.then = (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve)
      return chain
    }),
  })),
}))

import CommunicationsPage from './page'

describe('Communications outbox page ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.listEmailOutbox.mockResolvedValue([])
    mocks.getEmailDeliveryStats.mockResolvedValue({
      total: 0, sent: 0, failed: 0, skipped: 0, queued: 0, last24h: 0,
      emailLive: false, fromAddress: 'Beacon <onboarding@resend.dev>',
    })
  })

  it('filters both teacher rows and stats by the verified sender', async () => {
    await CommunicationsPage()

    expect(mocks.listEmailOutbox).toHaveBeenCalledWith(mocks.profile.school_id, 100, {
      senderId: mocks.profile.id,
    })
    expect(mocks.getEmailDeliveryStats).toHaveBeenCalledWith(mocks.profile.school_id, {
      senderId: mocks.profile.id,
    })
  })
})

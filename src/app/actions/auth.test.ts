import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAdmin } from '@/lib/test/mock-supabase'

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  getUser: vi.fn(),
  rateLimitAsync: vi.fn(),
  recordPilotActivity: vi.fn(),
  redirect: vi.fn(),
  admin: null as ReturnType<typeof createMockAdmin> | null,
}))

vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('@/lib/security/rate-limit', () => ({ rateLimitAsync: mocks.rateLimitAsync }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      getUser: mocks.getUser,
    },
  }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mocks.admin) throw new Error('admin mock not set')
    return mocks.admin
  },
}))
vi.mock('@/lib/pilot-analytics/activity', () => ({
  recordPilotActivity: mocks.recordPilotActivity,
}))

import { login } from './auth'

const user = {
  id: '11111111-1111-4111-8111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'teacher@example.com',
  email_confirmed_at: '2026-08-01T12:00:00.000Z',
  phone: '',
  confirmed_at: '2026-08-01T12:00:00.000Z',
  last_sign_in_at: '2026-08-09T12:00:00.000Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: {},
  identities: [],
  created_at: '2026-08-01T12:00:00.000Z',
  updated_at: '2026-08-09T12:00:00.000Z',
  is_anonymous: false,
}

function form(next = ''): FormData {
  const data = new FormData()
  data.set('email', 'Teacher@Example.com ')
  data.set('password', 'correct horse battery staple')
  data.set('next', next)
  return data
}

function successfulSignIn() {
  mocks.signInWithPassword.mockResolvedValue({
    data: {
      user,
      session: {
        access_token: 'access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: 1_786_284_000,
        refresh_token: 'refresh-token',
        user,
      },
    },
    error: null,
  })
  mocks.getUser.mockResolvedValue({ data: { user }, error: null })
}

describe('login pilot activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.rateLimitAsync.mockResolvedValue({ ok: true })
    mocks.recordPilotActivity.mockResolvedValue({ recorded: true })
    mocks.redirect.mockImplementation((path: string) => {
      throw new Error(`NEXT_REDIRECT:${path}`)
    })
    mocks.admin = createMockAdmin({
      profiles: () => ({
        data: {
          id: user.id,
          school_id: 'school-1',
          role: 'teacher',
          full_name: 'Test Teacher',
          email: user.email,
          phone: null,
        },
        error: null,
      }),
    })
  })

  it('does not record a failed sign-in and preserves the generic credential error', async () => {
    mocks.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: {
        name: 'AuthApiError',
        status: 400,
        code: 'invalid_credentials',
        message: 'Invalid login credentials',
      },
    })

    await expect(login({}, form('/classes/class-1'))).resolves.toEqual({
      error: 'Invalid email or password.',
    })
    expect(mocks.recordPilotActivity).not.toHaveBeenCalled()
  })

  it('records a successful sign-in before honoring a valid non-default next path', async () => {
    successfulSignIn()

    await expect(login({}, form('/classes/class-1'))).rejects.toThrow(
      'NEXT_REDIRECT:/classes/class-1'
    )
    expect(mocks.recordPilotActivity).toHaveBeenCalledWith({
      schoolId: 'school-1',
      userId: user.id,
      actorRole: 'teacher',
      eventType: 'sign_in',
    })
  })

  it('keeps successful redirect behavior when activity recording reports failure', async () => {
    successfulSignIn()
    mocks.recordPilotActivity.mockResolvedValue({ recorded: false })

    await expect(login({}, form('/classes/class-1'))).rejects.toThrow(
      'NEXT_REDIRECT:/classes/class-1'
    )
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAdmin } from '@/lib/test/mock-supabase'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  admin: null as ReturnType<typeof createMockAdmin> | null,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
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

import { requireClassManager } from './class-access'

describe('requireClassManager', () => {
  beforeEach(() => {
    mocks.getUser.mockReset()
    mocks.admin = null
  })

  it('rejects unsigned-in users', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mocks.admin = createMockAdmin({})
    const r = await requireClassManager('c1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Not signed in/i)
  })

  it('rejects missing class', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'u1' } },
      error: null,
    })
    mocks.admin = createMockAdmin({
      classes: () => ({ data: null, error: null }),
      profiles: () => ({
        data: {
          role: 'teacher',
          school_id: 's1',
          full_name: 'T',
          email: 't@s.org',
        },
        error: null,
      }),
    })
    const r = await requireClassManager('missing')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Class not found/i)
  })

  it('allows assigned teacher at same school', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'teacher-1' } },
      error: null,
    })
    mocks.admin = createMockAdmin({
      classes: () => ({
        data: {
          id: 'c1',
          teacher_id: 'teacher-1',
          school_id: 's1',
          name: 'Math',
        },
        error: null,
      }),
      profiles: () => ({
        data: {
          role: 'teacher',
          school_id: 's1',
          full_name: 'Teach',
          email: 't@s.org',
        },
        error: null,
      }),
    })
    const r = await requireClassManager('c1')
    expect(r.ok).toBe(true)
  })

  it('denies teacher of a different class', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'teacher-2' } },
      error: null,
    })
    mocks.admin = createMockAdmin({
      classes: () => ({
        data: {
          id: 'c1',
          teacher_id: 'teacher-1',
          school_id: 's1',
          name: 'Math',
        },
        error: null,
      }),
      profiles: () => ({
        data: {
          role: 'teacher',
          school_id: 's1',
          full_name: 'Other',
          email: 'o@s.org',
        },
        error: null,
      }),
    })
    const r = await requireClassManager('c1')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/permission/i)
  })

  it('denies principal with null school_id (fail closed)', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'p1' } },
      error: null,
    })
    mocks.admin = createMockAdmin({
      classes: () => ({
        data: {
          id: 'c1',
          teacher_id: 'teacher-1',
          school_id: 's1',
          name: 'Math',
        },
        error: null,
      }),
      profiles: () => ({
        data: {
          role: 'principal',
          school_id: null,
          full_name: 'P',
          email: 'p@s.org',
        },
        error: null,
      }),
    })
    const r = await requireClassManager('c1')
    expect(r.ok).toBe(false)
  })

  it('allows principal for matching school', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'p1' } },
      error: null,
    })
    mocks.admin = createMockAdmin({
      classes: () => ({
        data: {
          id: 'c1',
          teacher_id: 'teacher-1',
          school_id: 's1',
          name: 'Math',
        },
        error: null,
      }),
      profiles: () => ({
        data: {
          role: 'principal',
          school_id: 's1',
          full_name: 'P',
          email: 'p@s.org',
        },
        error: null,
      }),
    })
    const r = await requireClassManager('c1')
    expect(r.ok).toBe(true)
  })

  it('denies principal for foreign school class', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'p1' } },
      error: null,
    })
    mocks.admin = createMockAdmin({
      classes: () => ({
        data: {
          id: 'c1',
          teacher_id: 'teacher-1',
          school_id: 's-other',
          name: 'Math',
        },
        error: null,
      }),
      profiles: () => ({
        data: {
          role: 'principal',
          school_id: 's1',
          full_name: 'P',
          email: 'p@s.org',
        },
        error: null,
      }),
    })
    const r = await requireClassManager('c1')
    expect(r.ok).toBe(false)
  })
})

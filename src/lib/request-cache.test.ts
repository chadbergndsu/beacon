import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  counts: { profile: 0, school: 0, preferences: 0 },
}))

vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>('react')
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T) => {
      const values = new Map<string, ReturnType<T>>()
      return ((...args: Parameters<T>) => {
        const key = JSON.stringify(args)
        if (!values.has(key)) values.set(key, fn(...args) as ReturnType<T>)
        return values.get(key)
      }) as T
    },
  }
})

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from(table: string) {
      let columns = ''
      const query = {
        select(nextColumns: string) {
          columns = nextColumns
          return query
        },
        eq() {
          return query
        },
        order() {
          return query
        },
        limit() {
          return query
        },
        async maybeSingle() {
          if (table === 'profiles' && columns === 'preferences') {
            mocks.counts.preferences += 1
            return { data: { preferences: { skin: 'classic' } }, error: null }
          }
          if (table === 'profiles') {
            mocks.counts.profile += 1
            return {
              data: {
                id: 'user-1',
                school_id: 'school-1',
                role: 'principal',
                full_name: 'Pat Principal',
                email: 'principal@example.com',
                phone: null,
              },
              error: null,
            }
          }
          mocks.counts.school += 1
          return {
            data: { id: 'school-1', name: 'Beacon School', settings: {} },
            error: null,
          }
        },
      }
      return query
    },
  }),
}))

import { getProfile } from './auth'
import { loadSchoolBrand } from './school-brand'
import { loadUserPreferences } from './view-prefs/store'

describe('request-scoped server reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.counts = { profile: 0, school: 0, preferences: 0 }
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'principal@example.com' } },
      error: null,
    })
  })

  it('deduplicates stable auth, profile, brand, and preference reads in one request', async () => {
    await Promise.all([getProfile(), getProfile()])
    await Promise.all([loadSchoolBrand('school-1'), loadSchoolBrand('school-1')])
    await Promise.all([loadUserPreferences('user-1'), loadUserPreferences('user-1')])

    expect(mocks.getUser).toHaveBeenCalledTimes(1)
    expect(mocks.counts).toEqual({ profile: 1, school: 1, preferences: 1 })
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAdmin } from '@/lib/test/mock-supabase'

const mocks = vi.hoisted(() => ({
  admin: null as ReturnType<typeof createMockAdmin> | null,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mocks.admin) throw new Error('admin mock not set')
    return mocks.admin
  },
}))

import { teacherCanViewStudent } from './gradebook-data'

describe('teacherCanViewStudent', () => {
  beforeEach(() => {
    mocks.admin = null
  })

  it('returns false when teacher has no classes', async () => {
    mocks.admin = createMockAdmin({
      classes: () => ({ data: [], error: null }),
    })
    expect(await teacherCanViewStudent('t1', 'st1', 's1')).toBe(false)
  })

  it('returns true when student is enrolled in teacher class', async () => {
    mocks.admin = createMockAdmin({
      classes: () => ({ data: [{ id: 'c1' }, { id: 'c2' }], error: null }),
      enrollments: ({ filters }) => {
        const ids = filters['in:class_id'] as string[] | undefined
        if (filters.student_id === 'st1' && ids?.includes('c1')) {
          return { data: [{ student_id: 'st1' }], error: null }
        }
        return { data: [], error: null }
      },
    })
    expect(await teacherCanViewStudent('t1', 'st1', 's1')).toBe(true)
  })

  it('returns false when student not on teacher roster', async () => {
    mocks.admin = createMockAdmin({
      classes: () => ({ data: [{ id: 'c1' }], error: null }),
      enrollments: () => ({ data: [], error: null }),
    })
    expect(await teacherCanViewStudent('t1', 'st-other', 's1')).toBe(false)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAdmin } from '@/lib/test/mock-supabase'

const mockAdmin = vi.hoisted(() => ({ current: null as ReturnType<typeof createMockAdmin> | null }))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mockAdmin.current) throw new Error('mock admin not set')
    return mockAdmin.current
  },
}))

import { processBadgeScan } from './store'

describe('processBadgeScan (integration, mocked DB)', () => {
  beforeEach(() => {
    mockAdmin.current = null
  })

  it('rejects short / empty codes before DB write', async () => {
    mockAdmin.current = createMockAdmin({})
    const r = await processBadgeScan({
      schoolId: 's1',
      rawCode: 'AB',
      roomId: 'r1',
      direction: 'in',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/valid badge/i)
  })

  it('rejects unknown badge at school', async () => {
    mockAdmin.current = createMockAdmin({
      students: ({ filters }) => {
        if (filters.badge_code || filters.rfid_uid) {
          return { data: null, error: null }
        }
        return { data: null, error: null }
      },
    })
    const r = await processBadgeScan({
      schoolId: 's1',
      rawCode: 'ABCD12',
      roomId: 'r1',
      direction: 'in',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/No student found/i)
  })

  it('rejects when room is not at school', async () => {
    const student = {
      id: 'st1',
      first_name: 'Ann',
      last_name: 'Bee',
      school_id: 's1',
      active: true,
      badge_code: 'ABCD12',
      rfid_uid: null,
    }
    mockAdmin.current = createMockAdmin({
      students: ({ filters }) => {
        if (filters.badge_code === 'ABCD12') return { data: student, error: null }
        return { data: null, error: null }
      },
      badge_scans: () => ({ data: null, error: null }),
      school_rooms: () => ({ data: null, error: null }),
    })
    const r = await processBadgeScan({
      schoolId: 's1',
      rawCode: 'ABCD12',
      roomId: 'wrong-room',
      direction: 'in',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Room not found/i)
  })

  it('debounces duplicate scan within window', async () => {
    const student = {
      id: 'st1',
      first_name: 'Ann',
      last_name: 'Bee',
      school_id: 's1',
      active: true,
      badge_code: 'ABCD12',
      rfid_uid: null,
    }
    mockAdmin.current = createMockAdmin({
      students: ({ filters }) => {
        if (filters.badge_code === 'ABCD12') return { data: student, error: null }
        if (filters.id === 'st1') return { data: student, error: null }
        return { data: null, error: null }
      },
      badge_scans: ({ filters }) => {
        if (filters.direction === 'in') {
          return { data: { id: 'scan1', scanned_at: new Date().toISOString() }, error: null }
        }
        return { data: null, error: null }
      },
      school_rooms: () => ({
        data: {
          id: 'r1',
          school_id: 's1',
          name: 'Room',
          kind: 'classroom',
          class_id: null,
          billable: false,
          rate_cents_per_hour: 0,
          active: true,
          sort_order: 0,
        },
        error: null,
      }),
    })
    const r = await processBadgeScan({
      schoolId: 's1',
      rawCode: 'ABCD12',
      roomId: 'r1',
      direction: 'in',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/Already scanned/i)
  })

  it('rejects inactive student via studentId path', async () => {
    mockAdmin.current = createMockAdmin({
      students: () => ({
        data: {
          id: 'st1',
          first_name: 'Ann',
          last_name: 'Bee',
          school_id: 's1',
          active: false,
          badge_code: 'ABCD12',
          rfid_uid: null,
        },
        error: null,
      }),
    })
    const r = await processBadgeScan({
      schoolId: 's1',
      studentId: 'st1',
      roomId: 'r1',
      direction: 'in',
    })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.error).toMatch(/inactive|not found/i)
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAdmin } from '@/lib/test/mock-supabase'
import type { Role } from '@/lib/types'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsertAttendanceBatch: vi.fn(),
  recordPilotActivity: vi.fn(),
  revalidatePath: vi.fn(),
  admin: null as ReturnType<typeof createMockAdmin> | null,
}))

vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mocks.admin) throw new Error('admin mock not set')
    return mocks.admin
  },
}))
vi.mock('@/lib/attendance/store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/attendance/store')>(
    '@/lib/attendance/store'
  )
  return { ...actual, upsertAttendanceBatch: mocks.upsertAttendanceBatch }
})
vi.mock('@/lib/pilot-analytics/activity', () => ({
  recordPilotActivity: mocks.recordPilotActivity,
}))

import { saveAttendance } from './attendance'

const userId = '11111111-1111-4111-8111-111111111111'
const studentId = '22222222-2222-4222-8222-222222222222'
const classId = '33333333-3333-4333-8333-333333333333'

function adminFor(input: {
  role: Role
  teacherId?: string
  schoolId?: string
  profileSchoolId?: string
}) {
  const schoolId = input.schoolId ?? 'school-1'
  return createMockAdmin({
    classes: () => ({
      data: {
        id: classId,
        teacher_id: input.teacherId ?? userId,
        school_id: schoolId,
        name: 'Homeroom',
      },
      error: null,
    }),
    profiles: () => ({
      data: {
        role: input.role,
        school_id: input.profileSchoolId ?? schoolId,
        full_name: 'Staff User',
        email: `${input.role}@example.com`,
      },
      error: null,
    }),
    enrollments: () => ({ data: [{ student_id: studentId }], error: null }),
    audit_logs: () => ({ data: null, error: null }),
  })
}

describe('saveAttendance pilot activity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'teacher@example.com',
          app_metadata: { provider: 'email', providers: ['email'] },
          user_metadata: {},
          identities: [],
          created_at: '2026-08-01T12:00:00.000Z',
          updated_at: '2026-08-09T12:00:00.000Z',
        },
      },
      error: null,
    })
    mocks.upsertAttendanceBatch.mockResolvedValue({ usedTable: true })
    mocks.recordPilotActivity.mockResolvedValue({ recorded: true })
  })

  it('does not record rejected attendance saves', async () => {
    mocks.admin = adminFor({ role: 'teacher', teacherId: 'different-teacher' })

    await expect(
      saveAttendance(classId, '2026-08-09', [
        { studentId, status: 'present', note: 'private note' },
      ])
    ).resolves.toEqual({
      ok: false,
      error: 'You do not have permission to manage this class.',
    })
    expect(mocks.recordPilotActivity).not.toHaveBeenCalled()
  })

  it('does not record when attendance persistence fails', async () => {
    mocks.admin = adminFor({ role: 'teacher' })
    mocks.upsertAttendanceBatch.mockResolvedValue({
      usedTable: true,
      error: 'database offline',
    })

    await expect(
      saveAttendance(classId, '2026-08-09', [{ studentId, status: 'present' }])
    ).resolves.toEqual({ ok: false, error: 'database offline' })
    expect(mocks.recordPilotActivity).not.toHaveBeenCalled()
  })

  it('records successful teacher attendance persistence without row data', async () => {
    mocks.admin = adminFor({ role: 'teacher' })

    await expect(
      saveAttendance(classId, '2026-08-09', [
        { studentId, status: 'present', note: 'private note' },
      ])
    ).resolves.toStrictEqual({ ok: true, notifyNote: undefined })
    expect(mocks.recordPilotActivity).toHaveBeenCalledWith({
      schoolId: 'school-1',
      userId,
      actorRole: 'teacher',
      eventType: 'teacher_work',
    })
  })

  it.each<Role>(['principal', 'admin'])(
    'does not count successful %s attendance saves as teacher work',
    async (role) => {
      mocks.admin = adminFor({ role })

      await expect(
        saveAttendance(classId, '2026-08-09', [{ studentId, status: 'present' }])
      ).resolves.toStrictEqual({ ok: true, notifyNote: undefined })
      expect(mocks.recordPilotActivity).not.toHaveBeenCalled()
    }
  )

  it('keeps a successful teacher attendance result when activity recording reports failure', async () => {
    mocks.admin = adminFor({ role: 'teacher' })
    mocks.recordPilotActivity.mockResolvedValue({ recorded: false })

    await expect(
      saveAttendance(classId, '2026-08-09', [{ studentId, status: 'present' }])
    ).resolves.toStrictEqual({ ok: true, notifyNote: undefined })
  })
})

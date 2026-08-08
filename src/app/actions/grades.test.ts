import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAdmin } from '@/lib/test/mock-supabase'
import type { Role } from '@/lib/types'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  recordPilotActivity: vi.fn(),
  revalidatePath: vi.fn(),
  notifyParentsOfGradeSave: vi.fn(),
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
vi.mock('@/lib/email/grade-notify', () => ({
  notifyParentsOfGradeSave: mocks.notifyParentsOfGradeSave,
}))
vi.mock('@/lib/pilot-analytics/activity', () => ({
  recordPilotActivity: mocks.recordPilotActivity,
}))

import { saveGrades } from './grades'

const userId = '11111111-1111-4111-8111-111111111111'
const studentId = '22222222-2222-4222-8222-222222222222'
const assignmentId = 'assignment-1'
const classId = 'class-1'

const grade = {
  assignment_id: assignmentId,
  student_id: studentId,
  score: 92,
  is_missing: false,
  is_late: false,
  comments: null,
}

function adminFor(input: {
  role: Role
  teacherId?: string
  schoolId?: string
  profileSchoolId?: string
  gradeError?: { message: string } | null
}) {
  const schoolId = input.schoolId ?? 'school-1'
  const profileSchoolId = input.profileSchoolId ?? schoolId
  return createMockAdmin({
    classes: () => ({
      data: {
        id: classId,
        name: 'Algebra',
        teacher_id: input.teacherId ?? userId,
        school_id: schoolId,
      },
      error: null,
    }),
    profiles: () => ({
      data: {
        role: input.role,
        school_id: profileSchoolId,
        email: `${input.role}@example.com`,
      },
      error: null,
    }),
    assignments: () => ({ data: [{ id: assignmentId }], error: null }),
    enrollments: () => ({ data: [{ student_id: studentId }], error: null }),
    grades: () => ({ data: null, error: input.gradeError ?? null }),
    audit_logs: () => ({ data: null, error: null }),
  })
}

describe('saveGrades pilot activity', () => {
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
    mocks.recordPilotActivity.mockResolvedValue({ recorded: true })
    mocks.notifyParentsOfGradeSave.mockResolvedValue({ sent: 0, note: null })
  })

  it('does not record rejected grade saves', async () => {
    mocks.admin = adminFor({ role: 'teacher', teacherId: 'different-teacher' })

    await expect(saveGrades(classId, [grade])).resolves.toEqual({
      ok: false,
      error: 'You do not have permission to save grades for this class.',
    })
    expect(mocks.recordPilotActivity).not.toHaveBeenCalled()
  })

  it('does not record when grade persistence fails', async () => {
    mocks.admin = adminFor({ role: 'teacher', gradeError: { message: 'database offline' } })

    await expect(saveGrades(classId, [grade])).resolves.toEqual({
      ok: false,
      error: 'database offline',
    })
    expect(mocks.recordPilotActivity).not.toHaveBeenCalled()
  })

  it('records successful teacher grade persistence without grade payload data', async () => {
    mocks.admin = adminFor({ role: 'teacher' })

    await expect(saveGrades(classId, [grade])).resolves.toStrictEqual({
      ok: true,
      notifyNote: undefined,
      dropped: undefined,
    })
    expect(mocks.recordPilotActivity).toHaveBeenCalledWith({
      schoolId: 'school-1',
      userId,
      actorRole: 'teacher',
      eventType: 'teacher_work',
    })
  })

  it.each<Role>(['principal', 'admin'])(
    'does not count successful %s grade saves as teacher work',
    async (role) => {
      mocks.admin = adminFor({ role })

      await expect(saveGrades(classId, [grade])).resolves.toStrictEqual({
        ok: true,
        notifyNote: undefined,
        dropped: undefined,
      })
      expect(mocks.recordPilotActivity).not.toHaveBeenCalled()
    }
  )

  it('keeps a successful teacher grade result when activity recording reports failure', async () => {
    mocks.admin = adminFor({ role: 'teacher' })
    mocks.recordPilotActivity.mockResolvedValue({ recorded: false })

    await expect(saveGrades(classId, [grade])).resolves.toStrictEqual({
      ok: true,
      notifyNote: undefined,
      dropped: undefined,
    })
  })
})

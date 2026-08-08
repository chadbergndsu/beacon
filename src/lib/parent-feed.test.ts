import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defaultBillingState } from '@/lib/billing/types'
import { createMockAdmin } from '@/lib/test/mock-supabase'
import type { MissingWorkSummary } from '@/lib/insights/missing-work'

const mocks = vi.hoisted(() => ({
  admin: null as ReturnType<typeof createMockAdmin> | null,
  loadMissingWorkForStudent: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mocks.admin) throw new Error('admin mock not set')
    return mocks.admin
  },
}))
vi.mock('@/lib/insights/load-missing-work', () => ({
  loadMissingWorkForStudent: mocks.loadMissingWorkForStudent,
}))
vi.mock('@/lib/school-modules/store', () => ({ listPulsesForStudent: vi.fn(async () => []) }))
vi.mock('@/lib/attendance/store', () => ({ loadAttendanceForStudent: vi.fn(async () => []) }))
vi.mock('@/lib/billing/store', async () => {
  const actual = await vi.importActual<typeof import('@/lib/billing/store')>(
    '@/lib/billing/store'
  )
  return {
    ...actual,
    loadBillingState: vi.fn(async () => defaultBillingState()),
  }
})

import { buildParentFeed } from './parent-feed'

const children = [
  { id: 'student-1', first_name: 'Ava', last_name: 'Able' },
  { id: 'student-2', first_name: 'Ben', last_name: 'Baker' },
]

const missingSummaries: MissingWorkSummary[] = [
  {
    studentId: 'student-1',
    studentName: 'Ava Able',
    missing: [
      {
        assignmentId: 'assignment-1',
        title: 'Number practice',
        classId: 'class-1',
        className: 'Math',
        dueDate: '2020-01-01',
        maxPoints: 10,
        status: 'missing',
      },
    ],
    upcoming: [],
    missingCount: 1,
    upcomingCount: 0,
  },
  {
    studentId: 'student-2',
    studentName: 'Ben Baker',
    missing: [],
    upcoming: [],
    missingCount: 0,
    upcomingCount: 0,
  },
]

describe('buildParentFeed bulk parent reads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reuses missing-work summaries and bulk-loads grade assignment details', async () => {
    const calls = { grades: 0, assignments: 0 }
    const assignmentFilters: Array<Record<string, unknown>> = []
    mocks.loadMissingWorkForStudent.mockResolvedValue({
      missing: [],
      upcoming: [],
      missingCount: 0,
      upcomingCount: 0,
    })
    mocks.admin = createMockAdmin({
      announcements: () => ({ data: [], error: null }),
      grades: () => {
        calls.grades += 1
        return {
          data: [
            {
              id: 'grade-1',
              assignment_id: 'assignment-1',
              student_id: 'student-1',
              score: 10,
              is_missing: false,
              entered_at: '2026-08-07T12:00:00.000Z',
            },
            {
              id: 'grade-2',
              assignment_id: 'assignment-2',
              student_id: 'student-2',
              score: 8,
              is_missing: false,
              entered_at: '2026-08-07T11:00:00.000Z',
            },
          ],
          error: null,
        }
      },
      assignments: ({ filters }) => {
        calls.assignments += 1
        assignmentFilters.push({ ...filters })
        return {
          data: [
            { id: 'assignment-1', title: 'Number practice', class_id: 'class-1' },
            { id: 'assignment-2', title: 'Reading response', class_id: 'class-2' },
          ],
          error: null,
        }
      },
      profiles: () => ({ data: { email: 'parent@example.com' }, error: null }),
    })

    const items = await buildParentFeed(
      'parent-1',
      'school-1',
      children,
      missingSummaries
    )

    expect(mocks.loadMissingWorkForStudent).not.toHaveBeenCalled()
    expect(calls).toEqual({ grades: 1, assignments: 1 })
    expect(assignmentFilters).toEqual([
      {
        'in:id': ['assignment-1', 'assignment-2'],
        'classes.school_id': 'school-1',
      },
    ])
    expect(items.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        'Missing work · Ava Able',
        'Grade update · Ava Able',
        'Grade update · Ben Baker',
      ])
    )
  })
})

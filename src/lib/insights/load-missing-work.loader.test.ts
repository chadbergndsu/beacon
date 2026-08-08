import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

import { loadMissingWorkForParentChildren } from './load-missing-work'

describe('loadMissingWorkForParentChildren', () => {
  const originalPerfLog = process.env.BEACON_PERF_LOG

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    if (originalPerfLog === undefined) delete process.env.BEACON_PERF_LOG
    else process.env.BEACON_PERF_LOG = originalPerfLog
  })

  function setupLoader() {
    const calls: Record<string, Array<Record<string, unknown>>> = {
      enrollments: [],
      classes: [],
      assignments: [],
      grades: [],
    }
    mocks.admin = createMockAdmin({
      enrollments: ({ filters }) => {
        calls.enrollments.push({ ...filters })
        return {
          data: [
            { student_id: 'student-1', class_id: 'class-1' },
            { student_id: 'student-2', class_id: 'class-1' },
          ],
          error: null,
        }
      },
      classes: ({ filters }) => {
        calls.classes.push({ ...filters })
        return { data: [{ id: 'class-1', name: 'Math' }], error: null }
      },
      assignments: ({ filters }) => {
        calls.assignments.push({ ...filters })
        return {
          data: [
            {
              id: 'assignment-1',
              class_id: 'class-1',
              category_id: null,
              title: 'Number practice',
              max_points: 10,
              due_date: '2020-01-01',
              is_extra_credit: false,
            },
          ],
          error: null,
        }
      },
      grades: ({ filters }) => {
        calls.grades.push({ ...filters })
        return {
          data: [
            {
              assignment_id: 'assignment-1',
              student_id: 'student-1',
              score: 10,
              is_missing: false,
            },
          ],
          error: null,
        }
      },
    })
    return calls
  }

  const children = [
    { id: 'student-1', first_name: 'Ava', last_name: 'Able' },
    { id: 'student-2', first_name: 'Ben', last_name: 'Baker' },
  ]

  it('loads every child in four tenant-bounded query waves', async () => {
    const calls = setupLoader()

    const summaries = await loadMissingWorkForParentChildren(children, 'school-1')

    expect(calls).toEqual({
      enrollments: [{ 'in:student_id': ['student-1', 'student-2'] }],
      classes: [{ 'in:id': ['class-1'], school_id: 'school-1' }],
      assignments: [{ 'in:class_id': ['class-1'] }],
      grades: [
        {
          'in:assignment_id': ['assignment-1'],
          'in:student_id': ['student-1', 'student-2'],
        },
      ],
    })
    expect(summaries.map((summary) => [summary.studentId, summary.missingCount])).toEqual([
      ['student-1', 0],
      ['student-2', 1],
    ])
  })

  it('emits a structured production timing record for the bulk load', async () => {
    setupLoader()
    process.env.BEACON_PERF_LOG = '1'
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined)

    await loadMissingWorkForParentChildren(children, 'school-1')

    expect(info).toHaveBeenCalledWith(
      '[beacon:perf]',
      expect.stringMatching(
        /"operation":"parent\.missing_work".*"durationMs":\d+.*"status":"ok"/
      )
    )
  })
})

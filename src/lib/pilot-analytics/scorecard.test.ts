import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
type QueryOperation = [
  method: 'select' | 'eq' | 'in' | 'gte' | 'lte' | 'lt' | 'order' | 'limit',
  ...args: unknown[],
]
type QueryRecord = { table: string; operations: QueryOperation[] }

type PostgrestError = {
  code: string
  details: string
  hint: string
  message: string
}

type Script = {
  rows?: Record<string, Row[]>
  errors?: Record<string, PostgrestError>
  nullData?: string[]
}

const mocks = vi.hoisted(() => ({
  admin: null as null | { from: (table: string) => unknown },
  reportError: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mocks.admin) throw new Error('admin mock not set')
    return mocks.admin
  },
}))

vi.mock('@/lib/ops/report-error', () => ({
  reportError: mocks.reportError,
}))

import { loadPilotScorecard } from './scorecard'

function compare(left: unknown, right: unknown): number {
  return String(left).localeCompare(String(right))
}

function createScriptedAdmin(script: Script): {
  admin: { from: (table: string) => unknown }
  queries: QueryRecord[]
} {
  const queries: QueryRecord[] = []

  return {
    queries,
    admin: {
      from(table: string) {
        const query: QueryRecord = { table, operations: [] }
        queries.push(query)

        const builder = {
          select(...args: unknown[]) {
            query.operations.push(['select', ...args])
            return builder
          },
          eq(...args: unknown[]) {
            query.operations.push(['eq', ...args])
            return builder
          },
          in(...args: unknown[]) {
            query.operations.push(['in', ...args])
            return builder
          },
          gte(...args: unknown[]) {
            query.operations.push(['gte', ...args])
            return builder
          },
          lte(...args: unknown[]) {
            query.operations.push(['lte', ...args])
            return builder
          },
          lt(...args: unknown[]) {
            query.operations.push(['lt', ...args])
            return builder
          },
          order(...args: unknown[]) {
            query.operations.push(['order', ...args])
            return builder
          },
          limit(...args: unknown[]) {
            query.operations.push(['limit', ...args])
            return builder
          },
          then<TResult1 = unknown, TResult2 = never>(
            onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
            onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
          ): Promise<TResult1 | TResult2> {
            const error = script.errors?.[table]
            if (error) {
              return Promise.resolve({
                data: null,
                error,
                count: null,
                status: 500,
                statusText: 'Internal Server Error',
              }).then(onfulfilled, onrejected)
            }

            if (script.nullData?.includes(table)) {
              return Promise.resolve({
                data: null,
                error: null,
                count: null,
                status: 200,
                statusText: 'OK',
              }).then(onfulfilled, onrejected)
            }

            let data = [...(script.rows?.[table] ?? [])]
            for (const [method, ...args] of query.operations) {
              if (method === 'eq') {
                const [column, value] = args as [string, unknown]
                data = data.filter((row) => row[column] === value)
              } else if (method === 'in') {
                const [column, values] = args as [string, unknown[]]
                data = data.filter((row) => values.includes(row[column]))
              } else if (method === 'gte') {
                const [column, value] = args as [string, unknown]
                data = data.filter((row) => compare(row[column], value) >= 0)
              } else if (method === 'lte') {
                const [column, value] = args as [string, unknown]
                data = data.filter((row) => compare(row[column], value) <= 0)
              } else if (method === 'lt') {
                const [column, value] = args as [string, unknown]
                data = data.filter((row) => compare(row[column], value) < 0)
              } else if (method === 'order') {
                const [column, options] = args as [string, { ascending: boolean }]
                data.sort((left, right) => {
                  const result = compare(left[column], right[column])
                  return options.ascending ? result : -result
                })
              } else if (method === 'limit') {
                data = data.slice(0, args[0] as number)
              }
            }

            return Promise.resolve({
              data,
              error: null,
              count: null,
              status: 200,
              statusText: 'OK',
            }).then(onfulfilled, onrejected)
          },
        }

        return builder
      },
    },
  }
}

function successfulRows(): Record<string, Row[]> {
  return {
    profiles: [
      { id: 'teacher-1', school_id: 'school-1', role: 'teacher' },
      { id: 'teacher-2', school_id: 'school-1', role: 'teacher' },
      { id: 'parent-1', school_id: 'school-1', role: 'parent' },
      { id: 'teacher-other', school_id: 'school-2', role: 'teacher' },
    ],
    students: [
      { id: 'student-1', school_id: 'school-1', active: true },
      { id: 'student-2', school_id: 'school-1', active: true },
      { id: 'student-inactive', school_id: 'school-1', active: false },
      { id: 'student-other', school_id: 'school-2', active: true },
    ],
    parent_students: [
      { parent_id: 'parent-1', student_id: 'student-1' },
      { parent_id: 'parent-1', student_id: 'student-2' },
      { parent_id: 'parent-2', student_id: 'student-2' },
      { parent_id: 'parent-inactive', student_id: 'student-inactive' },
      { parent_id: 'parent-other', student_id: 'student-other' },
    ],
    pilot_activity_daily: [
      {
        school_id: 'school-1',
        user_id: 'teacher-1',
        actor_role: 'teacher',
        event_type: 'teacher_work',
        activity_date: '2026-08-07',
      },
      {
        school_id: 'school-1',
        user_id: 'teacher-1',
        actor_role: 'teacher',
        event_type: 'teacher_work',
        activity_date: '2026-08-06',
      },
      {
        school_id: 'school-1',
        user_id: 'teacher-1',
        actor_role: 'teacher',
        event_type: 'sign_in',
        activity_date: '2026-08-07',
      },
      {
        school_id: 'school-1',
        user_id: 'teacher-2',
        actor_role: 'teacher',
        event_type: 'sign_in',
        activity_date: '2026-08-07',
      },
      {
        school_id: 'school-1',
        user_id: 'teacher-not-eligible',
        actor_role: 'teacher',
        event_type: 'teacher_work',
        activity_date: '2026-08-07',
      },
      {
        school_id: 'school-1',
        user_id: 'parent-1',
        actor_role: 'parent',
        event_type: 'sign_in',
        activity_date: '2026-08-01',
      },
      {
        school_id: 'school-1',
        user_id: 'parent-2',
        actor_role: 'parent',
        event_type: 'parent_portal',
        activity_date: '2026-08-07',
      },
      {
        school_id: 'school-1',
        user_id: 'parent-not-eligible',
        actor_role: 'parent',
        event_type: 'parent_portal',
        activity_date: '2026-08-07',
      },
      {
        school_id: 'school-1',
        user_id: 'teacher-2',
        actor_role: 'teacher',
        event_type: 'teacher_work',
        activity_date: '2026-07-20',
      },
      {
        school_id: 'school-2',
        user_id: 'teacher-other',
        actor_role: 'teacher',
        event_type: 'teacher_work',
        activity_date: '2026-07-01',
      },
    ],
    attendance: [
      {
        date: '2026-08-01',
        school_id: 'school-1',
        updated_at: '2026-08-01T00:00:00.000Z',
      },
      {
        date: '2026-08-01',
        school_id: 'school-1',
        updated_at: '2026-08-02T12:00:00.000Z',
      },
      {
        date: '2026-08-07',
        school_id: 'school-1',
        updated_at: '2026-08-07T23:59:59.999Z',
      },
      {
        date: '2026-07-31',
        school_id: 'school-1',
        updated_at: '2026-07-31T23:59:59.999Z',
      },
      {
        date: '2026-08-05',
        school_id: 'school-2',
        updated_at: '2026-08-05T12:00:00.000Z',
      },
      {
        date: '2026-08-08',
        school_id: 'school-1',
        updated_at: '2026-08-08T00:00:00.000Z',
      },
    ],
    classes: [
      { id: 'class-1', school_id: 'school-1' },
      { id: 'class-2', school_id: 'school-1' },
      { id: 'class-other', school_id: 'school-2' },
    ],
    assignments: [
      { id: 'assignment-1', class_id: 'class-1' },
      { id: 'assignment-2', class_id: 'class-2' },
      { id: 'assignment-other', class_id: 'class-other' },
    ],
    grades: [
      { assignment_id: 'assignment-1', entered_at: '2026-08-01T00:00:00.000Z' },
      { assignment_id: 'assignment-1', entered_at: '2026-08-03T10:00:00.000Z' },
      { assignment_id: 'assignment-2', entered_at: '2026-08-07T15:00:00.000Z' },
      { assignment_id: 'assignment-2', entered_at: '2026-07-31T23:59:59.999Z' },
      { assignment_id: 'assignment-other', entered_at: '2026-08-05T10:00:00.000Z' },
      { assignment_id: 'assignment-2', entered_at: '2026-08-08T00:00:00.000Z' },
    ],
    email_outbox: [
      { school_id: 'school-1', status: 'sent', created_at: '2026-08-01T00:00:00.000Z' },
      { school_id: 'school-1', status: 'sent', created_at: '2026-08-04T00:00:00.000Z' },
      { school_id: 'school-1', status: 'failed', created_at: '2026-08-02T00:00:00.000Z' },
      { school_id: 'school-1', status: 'queued', created_at: '2026-08-03T00:00:00.000Z' },
      { school_id: 'school-1', status: 'skipped', created_at: '2026-08-07T23:59:59.999Z' },
      { school_id: 'school-2', status: 'sent', created_at: '2026-08-05T00:00:00.000Z' },
      { school_id: 'school-1', status: 'failed', created_at: '2026-08-08T00:00:00.000Z' },
    ],
    parent_experience_feedback: [
      {
        school_id: 'school-1',
        rating: 'helpful',
        comment: 'This helped.',
        created_at: '2026-08-07T11:00:00.000Z',
      },
      {
        school_id: 'school-1',
        rating: 'helpful',
        comment: '   ',
        created_at: '2026-08-06T11:00:00.000Z',
      },
      {
        school_id: 'school-1',
        rating: 'helpful',
        comment: 'Older context',
        created_at: '2026-07-20T11:00:00.000Z',
      },
      {
        school_id: 'school-1',
        rating: 'not_yet',
        comment: null,
        created_at: '2026-07-19T11:00:00.000Z',
      },
      {
        school_id: 'school-1',
        rating: 'not_yet',
        comment: null,
        created_at: '2026-07-18T11:00:00.000Z',
      },
      {
        school_id: 'school-2',
        rating: 'helpful',
        comment: 'Other school',
        created_at: '2026-08-07T11:00:00.000Z',
      },
      {
        school_id: 'school-1',
        rating: 'helpful',
        comment: 'Next window',
        created_at: '2026-08-08T00:00:00.000Z',
      },
    ],
    pilot_feedback: [
      { id: 'feedback-1', school_id: 'school-1', created_at: '2026-08-01T00:00:00.000Z' },
      { id: 'feedback-2', school_id: 'school-1', created_at: '2026-08-07T23:59:59.999Z' },
      { id: 'feedback-old', school_id: 'school-1', created_at: '2026-07-31T23:59:59.999Z' },
      { id: 'feedback-other', school_id: 'school-2', created_at: '2026-08-05T00:00:00.000Z' },
      { id: 'feedback-next', school_id: 'school-1', created_at: '2026-08-08T00:00:00.000Z' },
    ],
  }
}

function installScript(script: Script): QueryRecord[] {
  const { admin, queries } = createScriptedAdmin(script)
  mocks.admin = admin
  return queries
}

describe('loadPilotScorecard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.admin = null
  })

  it('aggregates distinct school-owned evidence into the consumer scorecard', async () => {
    const queries = installScript({ rows: successfulRows() })

    await expect(
      loadPilotScorecard('school-1', new Date('2026-08-07T16:30:00.000Z'))
    ).resolves.toEqual({
      windowStart: '2026-08-01',
      windowEnd: '2026-08-07',
      feedbackWindowStart: '2026-07-09',
      baseline: true,
      baselineDay: 19,
      activeTeachers: { state: 'ready', active: 1, eligible: 2, percent: 50 },
      activeLinkedParents: { state: 'ready', active: 2, eligible: 2, percent: 100 },
      attendanceActivity: { state: 'ready', primary: 2, secondary: 3 },
      gradeActivity: { state: 'ready', primary: 2, secondary: 3 },
      emailDelivery: { state: 'ready', delivered: 2, failed: 1, unsent: 2 },
      parentHelpfulness: { state: 'ready', helpful: 3, total: 5, percent: 60 },
      feedbackReceived: { state: 'ready', count: 3 },
    })

    const schoolOwnedTables = new Set([
      'profiles',
      'students',
      'pilot_activity_daily',
      'attendance',
      'classes',
      'email_outbox',
      'parent_experience_feedback',
      'pilot_feedback',
    ])
    for (const query of queries.filter(({ table }) => schoolOwnedTables.has(table))) {
      expect(query.operations, `${query.table} must be tenant scoped`).toContainEqual([
        'eq',
        'school_id',
        'school-1',
      ])
    }

    expect(queries).toContainEqual({
      table: 'attendance',
      operations: [
        ['select', 'date'],
        ['eq', 'school_id', 'school-1'],
        ['gte', 'updated_at', '2026-08-01T00:00:00.000Z'],
        ['lt', 'updated_at', '2026-08-08T00:00:00.000Z'],
      ],
    })
    expect(queries).toContainEqual({
      table: 'grades',
      operations: [
        ['select', 'assignment_id'],
        ['in', 'assignment_id', ['assignment-1', 'assignment-2']],
        ['gte', 'entered_at', '2026-08-01T00:00:00.000Z'],
        ['lt', 'entered_at', '2026-08-08T00:00:00.000Z'],
      ],
    })
  })

  it('suppresses the helpfulness percentage below five responses', async () => {
    const rows = successfulRows()
    rows.parent_experience_feedback = rows.parent_experience_feedback.slice(0, 4)
    installScript({ rows })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.parentHelpfulness).toEqual({
      state: 'small_sample',
      helpful: 3,
      total: 4,
      minimum: 5,
    })
  })

  it('marks only attendance unavailable when the attendance source fails', async () => {
    const attendanceError = {
      code: '08006',
      details: 'connection failure',
      hint: '',
      message: 'database unavailable',
    }
    installScript({ rows: successfulRows(), errors: { attendance: attendanceError } })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.attendanceActivity).toEqual({
      state: 'unavailable',
      reason: 'Attendance activity data is unavailable.',
    })
    expect(scorecard.activeTeachers.state).toBe('ready')
    expect(scorecard.activeLinkedParents.state).toBe('ready')
    expect(scorecard.gradeActivity.state).toBe('ready')
    expect(scorecard.emailDelivery.state).toBe('ready')
    expect(scorecard.parentHelpfulness.state).toBe('ready')
    expect(scorecard.feedbackReceived.state).toBe('ready')
    expect(mocks.reportError).toHaveBeenCalledTimes(1)
    expect(mocks.reportError).toHaveBeenCalledWith(attendanceError, {
      source: 'attendance',
      schoolId: 'school-1',
    })
  })

  it('does not turn a null attendance response into zero activity', async () => {
    installScript({ rows: successfulRows(), nullData: ['attendance'] })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.attendanceActivity).toEqual({
      state: 'unavailable',
      reason: 'Attendance activity data is unavailable.',
    })
    expect(scorecard.gradeActivity.state).toBe('ready')
    expect(scorecard.feedbackReceived.state).toBe('ready')
  })

  it('returns zero grade activity without issuing an empty in-filter query', async () => {
    const rows = successfulRows()
    rows.classes = rows.classes.filter((row) => row.school_id !== 'school-1')
    const queries = installScript({ rows })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.gradeActivity).toEqual({ state: 'ready', primary: 0, secondary: 0 })
    expect(queries.some(({ table }) => table === 'assignments')).toBe(false)
    expect(queries.some(({ table }) => table === 'grades')).toBe(false)
    expect(
      queries.flatMap(({ operations }) => operations).some(([method, , values]) => {
        return method === 'in' && Array.isArray(values) && values.length === 0
      })
    ).toBe(false)
  })
})

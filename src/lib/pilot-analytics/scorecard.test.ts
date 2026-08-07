import { beforeEach, describe, expect, it, vi } from 'vitest'

type Row = Record<string, unknown>
type QueryOperation = [
  method: 'select' | 'eq' | 'in' | 'gte' | 'lte' | 'lt' | 'order' | 'limit' | 'range',
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
  maxInValues?: number
  nullData?: string[]
  queryError?: (query: QueryRecord) => PostgrestError | undefined
  queryRejection?: (query: QueryRecord) => Error | undefined
  nullDataQuery?: (query: QueryRecord) => boolean
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
          range(...args: unknown[]) {
            query.operations.push(['range', ...args])
            return builder
          },
          then<TResult1 = unknown, TResult2 = never>(
            onfulfilled?: ((value: unknown) => TResult1 | PromiseLike<TResult1>) | null,
            onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
          ): Promise<TResult1 | TResult2> {
            const rejection = script.queryRejection?.(query)
            if (rejection) {
              return Promise.reject(rejection).then(onfulfilled, onrejected)
            }

            const oversizedInFilter = query.operations.find(([method, , values]) => {
              return (
                method === 'in' &&
                Array.isArray(values) &&
                script.maxInValues !== undefined &&
                values.length > script.maxInValues
              )
            })
            const error =
              script.queryError?.(query) ??
              script.errors?.[table] ??
              (oversizedInFilter
                ? {
                    code: '414',
                    details: 'request URI exceeds the test boundary',
                    hint: '',
                    message: 'URI too long',
                  }
                : undefined)
            if (error) {
              return Promise.resolve({
                data: null,
                error,
                count: null,
                status: error.code === '414' ? 414 : 500,
                statusText: error.code === '414' ? 'URI Too Long' : 'Internal Server Error',
              }).then(onfulfilled, onrejected)
            }

            if (script.nullData?.includes(table) || script.nullDataQuery?.(query)) {
              return Promise.resolve({
                data: null,
                error: null,
                count: null,
                status: 200,
                statusText: 'OK',
              }).then(onfulfilled, onrejected)
            }

            let data = [...(script.rows?.[table] ?? [])]
            const orders: Array<[string, { ascending: boolean }]> = []
            let limit: number | undefined
            let range: [number, number] | undefined
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
                orders.push(args as [string, { ascending: boolean }])
              } else if (method === 'limit') {
                limit = args[0] as number
              } else if (method === 'range') {
                range = args as [number, number]
              }
            }

            data.sort((left, right) => {
              for (const [column, options] of orders) {
                const result = compare(left[column], right[column])
                if (result !== 0) return options.ascending ? result : -result
              }
              return 0
            })
            if (limit !== undefined) data = data.slice(0, limit)
            if (range) data = data.slice(range[0], range[1] + 1)
            else data = data.slice(0, 1000)

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
      { id: 'parent-2', school_id: 'school-1', role: 'parent' },
      { id: 'parent-wrong-role', school_id: 'school-1', role: 'staff' },
      { id: 'parent-cross-school', school_id: 'school-2', role: 'parent' },
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
      { parent_id: 'parent-wrong-role', student_id: 'student-1' },
      { parent_id: 'parent-cross-school', student_id: 'student-1' },
      { parent_id: 'parent-missing-profile', student_id: 'student-1' },
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
        user_id: 'parent-wrong-role',
        actor_role: 'parent',
        event_type: 'parent_portal',
        activity_date: '2026-08-07',
      },
      {
        school_id: 'school-1',
        user_id: 'parent-cross-school',
        actor_role: 'parent',
        event_type: 'parent_portal',
        activity_date: '2026-08-07',
      },
      {
        school_id: 'school-1',
        user_id: 'parent-missing-profile',
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
      {
        school_id: 'school-1',
        kind: 'grade_notice',
        status: 'sent',
        meta: {},
        created_at: '2026-08-01T00:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'announcement',
        status: 'sent',
        meta: { recipient_role: 'parent' },
        created_at: '2026-08-04T00:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'attendance_notice',
        status: 'failed',
        meta: {},
        created_at: '2026-08-02T00:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'invoice',
        status: 'queued',
        meta: {},
        created_at: '2026-08-03T00:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'message',
        status: 'skipped',
        meta: { recipient_role: 'parent' },
        created_at: '2026-08-07T23:59:59.999Z',
      },
      {
        school_id: 'school-1',
        kind: 'aftercare_notice',
        status: 'sent',
        meta: {},
        created_at: '2026-08-02T12:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'dinner_digest',
        status: 'failed',
        meta: {},
        created_at: '2026-08-03T13:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'missing_work',
        status: 'skipped',
        meta: {},
        created_at: '2026-08-04T13:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'test',
        status: 'sent',
        meta: { test: true },
        created_at: '2026-08-03T12:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'pilot_feedback',
        status: 'failed',
        meta: {},
        created_at: '2026-08-04T12:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'system',
        status: 'queued',
        meta: {},
        created_at: '2026-08-05T12:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'announcement',
        status: 'sent',
        meta: { recipient_role: 'staff' },
        created_at: '2026-08-06T12:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'message',
        status: 'sent',
        meta: { recipient_role: 'principal' },
        created_at: '2026-08-06T13:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'welcome',
        status: 'sent',
        meta: {},
        created_at: '2026-08-06T14:00:00.000Z',
      },
      {
        school_id: 'school-2',
        kind: 'grade_notice',
        status: 'sent',
        meta: {},
        created_at: '2026-08-05T00:00:00.000Z',
      },
      {
        school_id: 'school-1',
        kind: 'grade_notice',
        status: 'failed',
        meta: {},
        created_at: '2026-08-08T00:00:00.000Z',
      },
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

function rowsCrossingParentChunkBoundary(): Record<string, Row[]> {
  const rows = successfulRows()
  rows.students = Array.from({ length: 101 }, (_, index) => ({
    id: `student-${String(index).padStart(3, '0')}`,
    school_id: 'school-1',
    active: true,
  }))
  rows.parent_students = Array.from({ length: 101 }, (_, index) => ({
    parent_id: `parent-${String(index).padStart(3, '0')}`,
    student_id: `student-${String(index).padStart(3, '0')}`,
  }))
  rows.profiles = [
    ...rows.profiles.filter((row) => row.role !== 'parent'),
    ...Array.from({ length: 101 }, (_, index) => ({
      id: `parent-${String(index).padStart(3, '0')}`,
      school_id: 'school-1',
      role: 'parent',
    })),
  ]
  rows.pilot_activity_daily = [
    ...rows.pilot_activity_daily.filter((row) => row.actor_role !== 'parent'),
    ...Array.from({ length: 101 }, (_, index) => ({
      school_id: 'school-1',
      user_id: `parent-${String(index).padStart(3, '0')}`,
      actor_role: 'parent',
      event_type: 'parent_portal',
      activity_date: '2026-08-07',
    })),
  ]
  return rows
}

function rowsCrossingGradeChunkBoundary(): Record<string, Row[]> {
  const rows = successfulRows()
  rows.classes = Array.from({ length: 101 }, (_, index) => ({
    id: `class-${String(index).padStart(3, '0')}`,
    school_id: 'school-1',
  }))
  rows.assignments = Array.from({ length: 101 }, (_, index) => ({
    id: `assignment-${String(index).padStart(3, '0')}`,
    class_id: `class-${String(index).padStart(3, '0')}`,
  }))
  rows.grades = Array.from({ length: 101 }, (_, index) => ({
    id: `grade-${String(index).padStart(3, '0')}`,
    assignment_id: `assignment-${String(index).padStart(3, '0')}`,
    entered_at: '2026-08-07T12:00:00.000Z',
  }))
  return rows
}

function inFilterValues(
  queries: QueryRecord[],
  table: string,
  column: string
): unknown[][] {
  return queries.flatMap((query) => {
    if (query.table !== table) return []
    return query.operations.flatMap(([method, candidateColumn, values]) => {
      return method === 'in' && candidateColumn === column && Array.isArray(values)
        ? [values]
        : []
    })
  })
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
      baseline: { state: 'gathering', day: 19 },
      activeTeachers: { state: 'ready', active: 1, eligible: 2, percent: 50 },
      activeLinkedParents: { state: 'ready', active: 2, eligible: 2, percent: 100 },
      attendanceActivity: { state: 'ready', primary: 2, secondary: 3 },
      gradeActivity: { state: 'ready', primary: 2, secondary: 3 },
      emailDelivery: { state: 'ready', delivered: 3, failed: 2, unsent: 3 },
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
        ['order', 'id', { ascending: true }],
        ['range', 0, 999],
      ],
    })
    expect(queries).toContainEqual({
      table: 'grades',
      operations: [
        ['select', 'assignment_id'],
        ['in', 'assignment_id', ['assignment-1', 'assignment-2']],
        ['gte', 'entered_at', '2026-08-01T00:00:00.000Z'],
        ['lt', 'entered_at', '2026-08-08T00:00:00.000Z'],
        ['order', 'id', { ascending: true }],
        ['range', 0, 999],
      ],
    })
    expect(queries).toContainEqual({
      table: 'email_outbox',
      operations: [
        ['select', 'status, kind, meta'],
        ['eq', 'school_id', 'school-1'],
        ['gte', 'created_at', '2026-08-01T00:00:00.000Z'],
        ['lt', 'created_at', '2026-08-08T00:00:00.000Z'],
        ['order', 'id', { ascending: true }],
        ['range', 0, 999],
      ],
    })

    for (const query of queries.filter(({ operations }) => {
      return !operations.some(([method]) => method === 'limit')
    })) {
      expect(query.operations, `${query.table} must use stable pagination`).toSatisfy(
        (operations: QueryOperation[]) => {
          return (
            operations.some(([method]) => method === 'order') &&
            operations.some(([method]) => method === 'range')
          )
        }
      )
    }
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

  it('excludes linked IDs without a current same-school parent profile', async () => {
    const queries = installScript({ rows: successfulRows() })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.activeLinkedParents).toEqual({
      state: 'ready',
      active: 2,
      eligible: 2,
      percent: 100,
    })
    expect(queries).toContainEqual({
      table: 'profiles',
      operations: [
        ['select', 'id'],
        ['eq', 'school_id', 'school-1'],
        ['eq', 'role', 'parent'],
        [
          'in',
          'id',
          [
            'parent-1',
            'parent-2',
            'parent-cross-school',
            'parent-missing-profile',
            'parent-wrong-role',
          ],
        ],
        ['order', 'id', { ascending: true }],
        ['range', 0, 999],
      ],
    })
  })

  it('does not issue an empty profile in-filter when active students have no parent links', async () => {
    const rows = successfulRows()
    rows.parent_students = []
    const queries = installScript({ rows })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.activeLinkedParents).toEqual({
      state: 'no_eligible',
      active: 0,
      eligible: 0,
    })
    expect(
      queries.some(({ table, operations }) => {
        return (
          table === 'profiles' &&
          operations.some(([method, column]) => method === 'eq' && column === 'role') &&
          operations.some(([method]) => method === 'in')
        )
      })
    ).toBe(false)
  })

  it('reports a successful empty earliest-activity query as not started', async () => {
    const rows = successfulRows()
    rows.pilot_activity_daily = []
    installScript({ rows })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.baseline).toEqual({ state: 'not_started' })
  })

  it.each(['error', 'rejection', 'null data'] as const)(
    'reports the baseline as unavailable after an earliest-activity %s response',
    async (failure) => {
      const databaseError = {
        code: '08006',
        details: 'connection failure',
        hint: '',
        message: 'database unavailable',
      }
      const isBaselineQuery = (query: QueryRecord) => {
        return query.operations.some(([method]) => method === 'limit')
      }
      installScript({
        rows: successfulRows(),
        queryError: failure === 'error' ? (query) => isBaselineQuery(query) ? databaseError : undefined : undefined,
        queryRejection:
          failure === 'rejection'
            ? (query) => isBaselineQuery(query) ? new Error('network unavailable') : undefined
            : undefined,
        nullDataQuery: failure === 'null data' ? isBaselineQuery : undefined,
      })

      const scorecard = await loadPilotScorecard(
        'school-1',
        new Date('2026-08-07T16:30:00.000Z')
      )

      expect(scorecard.baseline).toEqual({
        state: 'unavailable',
        reason: 'Baseline activity data is unavailable.',
      })
      expect(scorecard.activeTeachers.state).toBe('ready')
      expect(scorecard.activeLinkedParents.state).toBe('ready')
    }
  )

  it('includes a full first PostgREST page and the following page in exact activity totals', async () => {
    const rows = successfulRows()
    rows.attendance = Array.from({ length: 1001 }, (_, index) => ({
      id: `attendance-${String(index).padStart(4, '0')}`,
      date: index === 1000 ? '2026-08-02' : '2026-08-01',
      school_id: 'school-1',
      updated_at: '2026-08-07T12:00:00.000Z',
    }))
    const queries = installScript({ rows })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.attendanceActivity).toEqual({
      state: 'ready',
      primary: 2,
      secondary: 1001,
    })
    expect(
      queries
        .filter(({ table }) => table === 'attendance')
        .map(({ operations }) => operations.slice(-2))
    ).toEqual([
      [
        ['order', 'id', { ascending: true }],
        ['range', 0, 999],
      ],
      [
        ['order', 'id', { ascending: true }],
        ['range', 1000, 1999],
      ],
    ])
  })

  it('merges bounded student and linked-parent ID chunks into the exact parent ratio', async () => {
    const queries = installScript({
      rows: rowsCrossingParentChunkBoundary(),
      maxInValues: 100,
    })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.activeLinkedParents).toEqual({
      state: 'ready',
      active: 101,
      eligible: 101,
      percent: 100,
    })
    const studentChunks = inFilterValues(queries, 'parent_students', 'student_id')
    const parentChunks = inFilterValues(queries, 'profiles', 'id')
    expect(studentChunks.map((values) => values.length)).toEqual([100, 1])
    expect(parentChunks.map((values) => values.length)).toEqual([100, 1])
    expect([...studentChunks, ...parentChunks].every((values) => values.length <= 100)).toBe(
      true
    )
  })

  it('merges bounded class and assignment ID chunks into exact grade activity', async () => {
    const queries = installScript({
      rows: rowsCrossingGradeChunkBoundary(),
      maxInValues: 100,
    })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.gradeActivity).toEqual({
      state: 'ready',
      primary: 101,
      secondary: 101,
    })
    const classChunks = inFilterValues(queries, 'assignments', 'class_id')
    const assignmentChunks = inFilterValues(queries, 'grades', 'assignment_id')
    expect(classChunks.map((values) => values.length)).toEqual([100, 1])
    expect(assignmentChunks.map((values) => values.length)).toEqual([100, 1])
    expect([...classChunks, ...assignmentChunks].every((values) => values.length <= 100)).toBe(
      true
    )
  })

  it('fails grade activity closed when a later assignment-ID chunk fails', async () => {
    const laterChunkError = {
      code: '08006',
      details: 'connection failure',
      hint: '',
      message: 'database unavailable',
    }
    const queries = installScript({
      rows: rowsCrossingGradeChunkBoundary(),
      queryError: (query) => {
        const chunks = inFilterValues([query], 'grades', 'assignment_id')
        return chunks[0]?.length === 1 ? laterChunkError : undefined
      },
    })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.gradeActivity).toEqual({
      state: 'unavailable',
      reason: 'Grade activity data is unavailable.',
    })
    expect(inFilterValues(queries, 'grades', 'assignment_id').map((values) => values.length)).toEqual([
      100,
      1,
    ])
    expect(mocks.reportError).toHaveBeenCalledWith(laterChunkError, {
      source: 'grades',
      schoolId: 'school-1',
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

  it('fans out a parent feedback failure only to helpfulness and combined feedback', async () => {
    const parentFeedbackError = {
      code: '08006',
      details: 'connection failure',
      hint: '',
      message: 'database unavailable',
    }
    installScript({
      rows: successfulRows(),
      errors: { parent_experience_feedback: parentFeedbackError },
    })

    const scorecard = await loadPilotScorecard(
      'school-1',
      new Date('2026-08-07T16:30:00.000Z')
    )

    expect(scorecard.parentHelpfulness.state).toBe('unavailable')
    expect(scorecard.feedbackReceived).toEqual({
      state: 'unavailable',
      reason: 'Feedback data is unavailable.',
    })
    expect(scorecard.activeTeachers.state).toBe('ready')
    expect(scorecard.activeLinkedParents.state).toBe('ready')
    expect(scorecard.attendanceActivity.state).toBe('ready')
    expect(scorecard.gradeActivity.state).toBe('ready')
    expect(scorecard.emailDelivery.state).toBe('ready')
    expect(scorecard.baseline.state).toBe('gathering')
    expect(mocks.reportError).toHaveBeenCalledWith(parentFeedbackError, {
      source: 'parent_experience_feedback',
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

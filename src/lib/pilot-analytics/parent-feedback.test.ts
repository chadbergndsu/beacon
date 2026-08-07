import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  admin: null as null | { from: (table: string) => unknown },
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mocks.admin) throw new Error('admin mock not set')
    return mocks.admin
  },
}))

import {
  listParentExperienceFeedbackForLeadership,
  parentExperienceFeedbackSchema,
} from './parent-feedback'

describe('parentExperienceFeedbackSchema', () => {
  it.each([
    ['helpful', 'Helpful context', 'Helpful context'],
    ['not_yet', '  Needs a clearer summary.  ', 'Needs a clearer summary.'],
    ['helpful', '', null],
    ['not_yet', '   ', null],
  ] as const)('accepts %s and normalizes its optional comment', (rating, comment, expected) => {
    expect(
      parentExperienceFeedbackSchema.parse({
        rating,
        comment,
        surface: 'parent_dashboard',
      })
    ).toEqual({
      rating,
      comment: expected,
      surface: 'parent_dashboard',
    })
  })

  it('accepts an omitted comment as null', () => {
    expect(
      parentExperienceFeedbackSchema.parse({
        rating: 'helpful',
        surface: 'parent_dashboard',
      })
    ).toEqual({
      rating: 'helpful',
      comment: null,
      surface: 'parent_dashboard',
    })
  })

  it('rejects a missing or unsupported rating', () => {
    expect(
      parentExperienceFeedbackSchema.safeParse({ surface: 'parent_dashboard' }).success
    ).toBe(false)
    expect(
      parentExperienceFeedbackSchema.safeParse({
        rating: 'sometimes',
        surface: 'parent_dashboard',
      }).success
    ).toBe(false)
  })

  it('rejects a surface other than the parent dashboard', () => {
    expect(
      parentExperienceFeedbackSchema.safeParse({
        rating: 'helpful',
        surface: 'student_dashboard',
      }).success
    ).toBe(false)
  })

  it('accepts 500 trimmed comment characters and rejects 501', () => {
    expect(
      parentExperienceFeedbackSchema.safeParse({
        rating: 'helpful',
        comment: ` ${'a'.repeat(500)} `,
        surface: 'parent_dashboard',
      }).success
    ).toBe(true)
    expect(
      parentExperienceFeedbackSchema.safeParse({
        rating: 'helpful',
        comment: 'a'.repeat(501),
        surface: 'parent_dashboard',
      }).success
    ).toBe(false)
  })
})

describe('listParentExperienceFeedbackForLeadership', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns newest nonblank comments with only leadership-safe fields', async () => {
    const query: Array<[string, ...unknown[]]> = []
    const rows = [
      {
        id: 'feedback-2',
        parent_id: 'parent-secret-2',
        rating: 'not_yet',
        comment: 'I could use a clearer weekly summary.',
        created_at: '2026-08-07T14:00:00.000Z',
        email: 'parent@example.com',
        child_name: 'Student Secret',
      },
      {
        id: 'feedback-blank',
        rating: 'helpful',
        comment: '   ',
        created_at: '2026-08-07T13:00:00.000Z',
      },
      {
        id: 'feedback-1',
        rating: 'helpful',
        comment: 'The feed helped our family plan.',
        created_at: '2026-08-06T12:00:00.000Z',
      },
    ]
    const chain = {
      select(columns: string) {
        query.push(['select', columns])
        return chain
      },
      eq(column: string, value: unknown) {
        query.push(['eq', column, value])
        return chain
      },
      not(column: string, operator: string, value: unknown) {
        query.push(['not', column, operator, value])
        return chain
      },
      neq(column: string, value: unknown) {
        query.push(['neq', column, value])
        return chain
      },
      order(column: string, options: unknown) {
        query.push(['order', column, options])
        return chain
      },
      limit(value: number) {
        query.push(['limit', value])
        return Promise.resolve({ data: rows, error: null })
      },
    }
    mocks.admin = {
      from(table: string) {
        query.push(['from', table])
        return chain
      },
    }

    await expect(
      listParentExperienceFeedbackForLeadership('school-1', 25)
    ).resolves.toEqual([
      {
        id: 'feedback-2',
        rating: 'not_yet',
        comment: 'I could use a clearer weekly summary.',
        created_at: '2026-08-07T14:00:00.000Z',
      },
      {
        id: 'feedback-1',
        rating: 'helpful',
        comment: 'The feed helped our family plan.',
        created_at: '2026-08-06T12:00:00.000Z',
      },
    ])
    expect(query).toEqual([
      ['from', 'parent_experience_feedback'],
      ['select', 'id, rating, comment, created_at'],
      ['eq', 'school_id', 'school-1'],
      ['not', 'comment', 'is', null],
      ['neq', 'comment', ''],
      ['order', 'created_at', { ascending: false }],
      ['limit', 25],
    ])
  })

  it('returns an empty list when leadership feedback cannot be loaded', async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      not: () => chain,
      neq: () => chain,
      order: () => chain,
      limit: () => Promise.resolve({ data: null, error: { message: 'offline' } }),
    }
    mocks.admin = { from: () => chain }

    await expect(
      listParentExperienceFeedbackForLeadership('school-1')
    ).resolves.toEqual([])
  })
})

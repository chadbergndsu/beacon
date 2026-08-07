import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
}))

vi.mock('@/lib/auth', () => ({ getProfile: mocks.getProfile }))

import { submitParentExperienceFeedback } from './parent-feedback'

type Write = {
  table: string
  payload: unknown
  options: unknown
}

function formData(input: {
  rating?: string
  comment?: string
  surface?: string
}): FormData {
  const data = new FormData()
  if (input.rating !== undefined) data.set('rating', input.rating)
  if (input.comment !== undefined) data.set('comment', input.comment)
  if (input.surface !== undefined) data.set('surface', input.surface)
  return data
}

function sessionClient(writes: Write[], error: { message: string } | null = null) {
  return {
    from(table: string) {
      return {
        async upsert(payload: unknown, options: unknown) {
          writes.push({ table, payload, options })
          return { data: null, error }
        },
      }
    },
  }
}

function profileResult(input: {
  writes: Write[]
  role?: string
  schoolId?: string | null
  userId?: string | null
  error?: { message: string } | null
}) {
  return {
    user: input.userId === null ? null : { id: input.userId ?? 'parent-1' },
    profile:
      input.role === undefined
        ? null
        : {
            id: input.userId ?? 'parent-1',
            role: input.role,
            school_id: input.schoolId === undefined ? 'school-1' : input.schoolId,
            email: `${input.role}@example.com`,
          },
    supabase: sessionClient(input.writes, input.error),
  }
}

describe('submitParentExperienceFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an unauthenticated request without writing feedback', async () => {
    const writes: Write[] = []
    mocks.getProfile.mockResolvedValue(
      profileResult({ writes, role: 'parent', userId: null })
    )

    await expect(
      submitParentExperienceFeedback(
        {},
        formData({ rating: 'helpful', surface: 'parent_dashboard' })
      )
    ).resolves.toEqual({ error: 'Please sign in to share feedback.' })
    expect(writes).toHaveLength(0)
  })

  it('rejects a non-parent without writing feedback', async () => {
    const writes: Write[] = []
    mocks.getProfile.mockResolvedValue(profileResult({ writes, role: 'teacher' }))

    await expect(
      submitParentExperienceFeedback(
        {},
        formData({ rating: 'helpful', surface: 'parent_dashboard' })
      )
    ).resolves.toEqual({ error: 'Only parents can share this feedback.' })
    expect(writes).toHaveLength(0)
  })

  it('rejects a parent without a school without writing feedback', async () => {
    const writes: Write[] = []
    mocks.getProfile.mockResolvedValue(
      profileResult({ writes, role: 'parent', schoolId: null })
    )

    await expect(
      submitParentExperienceFeedback(
        {},
        formData({ rating: 'not_yet', surface: 'parent_dashboard' })
      )
    ).resolves.toEqual({ error: 'Your school could not be verified.' })
    expect(writes).toHaveLength(0)
  })

  it('rejects invalid input before writing feedback', async () => {
    const writes: Write[] = []
    mocks.getProfile.mockResolvedValue(profileResult({ writes, role: 'parent' }))

    await expect(
      submitParentExperienceFeedback(
        {},
        formData({ rating: 'maybe', surface: 'parent_dashboard' })
      )
    ).resolves.toEqual({ error: 'Choose Yes or Not yet.' })
    expect(writes).toHaveLength(0)
  })

  it('upserts the normalized weekly response through the signed-in session client', async () => {
    const writes: Write[] = []
    mocks.getProfile.mockResolvedValue(profileResult({ writes, role: 'parent' }))

    await expect(
      submitParentExperienceFeedback(
        {},
        formData({
          rating: 'not_yet',
          comment: '  A weekly overview would help.  ',
          surface: 'parent_dashboard',
        })
      )
    ).resolves.toEqual({ ok: true, rating: 'not_yet' })
    expect(writes).toEqual([
      {
        table: 'parent_experience_feedback',
        payload: {
          school_id: 'school-1',
          parent_id: 'parent-1',
          rating: 'not_yet',
          comment: 'A weekly overview would help.',
          surface: 'parent_dashboard',
          week_start: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        },
        options: { onConflict: 'school_id,parent_id,surface,week_start' },
      },
    ])
  })

  it('returns a safe error when the session write fails', async () => {
    const writes: Write[] = []
    mocks.getProfile.mockResolvedValue(
      profileResult({ writes, role: 'parent', error: { message: 'private database detail' } })
    )

    await expect(
      submitParentExperienceFeedback(
        {},
        formData({ rating: 'helpful', surface: 'parent_dashboard' })
      )
    ).resolves.toEqual({ error: 'We could not save your feedback. Please try again.' })
    expect(writes).toHaveLength(1)
  })
})

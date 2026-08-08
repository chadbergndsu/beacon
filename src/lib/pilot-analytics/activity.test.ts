import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { Role } from '@/lib/types'

const mocks = vi.hoisted(() => ({
  createAdminClient: vi.fn(),
  from: vi.fn(),
  upsert: vi.fn(),
  reportError: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: mocks.createAdminClient,
}))

vi.mock('@/lib/ops/report-error', () => ({
  reportError: mocks.reportError,
}))

import { recordPilotActivity } from './activity'
import type { PilotActivityEvent } from './activity'

describe('recordPilotActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createAdminClient.mockReturnValue({ from: mocks.from })
    mocks.from.mockReturnValue({ upsert: mocks.upsert })
    mocks.upsert.mockResolvedValue({ data: null, error: null })
  })

  it('exposes only supported actor roles and pilot event types', () => {
    type Input = Parameters<typeof recordPilotActivity>[0]

    expectTypeOf<Input['actorRole']>().toEqualTypeOf<Role>()
    expectTypeOf<PilotActivityEvent>().toEqualTypeOf<
      'sign_in' | 'teacher_work' | 'parent_portal'
    >()
  })

  it('records the UTC activity date with daily duplicate suppression', async () => {
    const result = await recordPilotActivity({
      schoolId: 'school-1',
      userId: 'teacher-1',
      actorRole: 'teacher',
      eventType: 'teacher_work',
      now: new Date('2026-08-10T00:00:00.000+09:00'),
    })

    expect(result).toEqual({ recorded: true })
    expect(mocks.from).toHaveBeenCalledWith('pilot_activity_daily')
    expect(mocks.upsert).toHaveBeenCalledWith(
      {
        school_id: 'school-1',
        user_id: 'teacher-1',
        actor_role: 'teacher',
        event_type: 'teacher_work',
        activity_date: '2026-08-09',
      },
      {
        onConflict: 'school_id,user_id,event_type,activity_date',
        ignoreDuplicates: true,
      }
    )
  })

  it('reports client-construction errors without exposing identifiers or throwing', async () => {
    const error = new Error('service role unavailable')
    mocks.createAdminClient.mockImplementation(() => {
      throw error
    })

    await expect(
      recordPilotActivity({
        schoolId: 'school-sensitive',
        userId: 'user-sensitive',
        actorRole: 'parent',
        eventType: 'parent_portal',
      })
    ).resolves.toEqual({ recorded: false })
    expect(mocks.reportError).toHaveBeenCalledWith(error, {
      surface: 'pilot-activity',
      actorRole: 'parent',
      eventType: 'parent_portal',
    })
  })

  it('reports returned database errors and does not claim the activity was recorded', async () => {
    const error = { code: '42501', message: 'permission denied' }
    mocks.upsert.mockResolvedValue({ data: null, error })

    await expect(
      recordPilotActivity({
        schoolId: 'school-1',
        userId: 'teacher-1',
        actorRole: 'teacher',
        eventType: 'sign_in',
      })
    ).resolves.toEqual({ recorded: false })
    expect(mocks.reportError).toHaveBeenCalledWith(error, {
      surface: 'pilot-activity',
      actorRole: 'teacher',
      eventType: 'sign_in',
    })
  })

  it('reports rejected database writes without throwing', async () => {
    const error = new Error('network unavailable')
    mocks.upsert.mockRejectedValue(error)

    await expect(
      recordPilotActivity({
        schoolId: 'school-1',
        userId: 'teacher-1',
        actorRole: 'teacher',
        eventType: 'teacher_work',
      })
    ).resolves.toEqual({ recorded: false })
    expect(mocks.reportError).toHaveBeenCalledWith(error, {
      surface: 'pilot-activity',
      actorRole: 'teacher',
      eventType: 'teacher_work',
    })
  })
})

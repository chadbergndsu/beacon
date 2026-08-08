import { reportError } from '@/lib/ops/report-error'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Role } from '@/lib/types'
import { utcDateKey } from './windows'

export type PilotActivityEvent = 'sign_in' | 'teacher_work' | 'parent_portal'

export async function recordPilotActivity(input: {
  schoolId: string
  userId: string
  actorRole: Role
  eventType: PilotActivityEvent
  now?: Date
}): Promise<{ recorded: boolean }> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from('pilot_activity_daily').upsert(
      {
        school_id: input.schoolId,
        user_id: input.userId,
        actor_role: input.actorRole,
        event_type: input.eventType,
        activity_date: utcDateKey(input.now ?? new Date()),
      },
      {
        onConflict: 'school_id,user_id,event_type,activity_date',
        ignoreDuplicates: true,
      }
    )

    if (error) {
      reportError(error, {
        surface: 'pilot-activity',
        actorRole: input.actorRole,
        eventType: input.eventType,
      })
      return { recorded: false }
    }

    return { recorded: true }
  } catch (error) {
    reportError(error, {
      surface: 'pilot-activity',
      actorRole: input.actorRole,
      eventType: input.eventType,
    })
    return { recorded: false }
  }
}

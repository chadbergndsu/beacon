'use server'

import { getProfile } from '@/lib/auth'
import {
  parentExperienceFeedbackSchema,
  type ParentExperienceRating,
} from '@/lib/pilot-analytics/parent-feedback'
import { isoWeekStart } from '@/lib/pilot-analytics/windows'
import { effectiveRole } from '@/lib/roles'

export type ParentFeedbackState = {
  ok?: boolean
  error?: string
  rating?: ParentExperienceRating
}

export async function submitParentExperienceFeedback(
  _previousState: ParentFeedbackState,
  formData: FormData
): Promise<ParentFeedbackState> {
  const { profile, user, supabase } = await getProfile()

  if (!user?.id) {
    return { error: 'Please sign in to share feedback.' }
  }

  if (effectiveRole(profile) !== 'parent') {
    return { error: 'Only parents can share this feedback.' }
  }

  if (!profile?.school_id) {
    return { error: 'Your school could not be verified.' }
  }

  const parsed = parentExperienceFeedbackSchema.safeParse({
    rating: formData.get('rating'),
    comment: formData.has('comment') ? formData.get('comment') : undefined,
    surface: formData.get('surface'),
  })

  if (!parsed.success) {
    return { error: 'Choose Yes or Not yet.' }
  }

  const { error } = await supabase.from('parent_experience_feedback').upsert(
    {
      school_id: profile.school_id,
      parent_id: user.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      surface: 'parent_dashboard',
      week_start: isoWeekStart(new Date()),
    },
    { onConflict: 'school_id,parent_id,surface,week_start' }
  )

  if (error) {
    return { error: 'We could not save your feedback. Please try again.' }
  }

  return { ok: true, rating: parsed.data.rating }
}

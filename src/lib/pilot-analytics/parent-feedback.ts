import { z } from 'zod'
import { reportError } from '@/lib/ops/report-error'
import { createAdminClient } from '@/lib/supabase/admin'

const normalizedCommentSchema = z.preprocess(
  (value) => (typeof value === 'string' ? value.trim() : value),
  z
    .string()
    .max(500)
    .optional()
    .transform((value) => value || null)
)

export const parentExperienceFeedbackSchema = z.object({
  rating: z.enum(['helpful', 'not_yet']),
  comment: normalizedCommentSchema,
  surface: z.literal('parent_dashboard'),
})

export type ParentExperienceRating = z.infer<
  typeof parentExperienceFeedbackSchema
>['rating']

export type ParentExperienceFeedbackItem = {
  id: string
  rating: ParentExperienceRating
  comment: string
  created_at: string
}

export type ParentExperienceFeedbackListResult =
  | { state: 'ready'; items: ParentExperienceFeedbackItem[] }
  | { state: 'unavailable'; reason: string }

function unavailableParentComments(
  error: unknown,
  schoolId: string
): ParentExperienceFeedbackListResult {
  reportError(error, { source: 'parent_experience_feedback', schoolId })
  return {
    state: 'unavailable',
    reason: 'Parent comments are temporarily unavailable.',
  }
}

export async function listParentExperienceFeedbackForLeadership(
  schoolId: string,
  limit = 50
): Promise<ParentExperienceFeedbackListResult> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('parent_experience_feedback')
      .select('id, rating, comment, created_at')
      .eq('school_id', schoolId)
      .not('comment', 'is', null)
      .neq('comment', '')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return unavailableParentComments(error, schoolId)
    if (!data) {
      return unavailableParentComments(
        new Error('Parent feedback query returned null data.'),
        schoolId
      )
    }

    const items = data.flatMap((row) => {
      const comment = typeof row.comment === 'string' ? row.comment.trim() : ''
      if (!comment || (row.rating !== 'helpful' && row.rating !== 'not_yet')) return []

      return [
        {
          id: String(row.id),
          rating: row.rating,
          comment,
          created_at: String(row.created_at),
        },
      ]
    })

    return { state: 'ready', items }
  } catch (error) {
    return unavailableParentComments(error, schoolId)
  }
}

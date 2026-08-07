import { z } from 'zod'
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

export async function listParentExperienceFeedbackForLeadership(
  schoolId: string,
  limit = 50
): Promise<ParentExperienceFeedbackItem[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('parent_experience_feedback')
    .select('id, rating, comment, created_at')
    .eq('school_id', schoolId)
    .not('comment', 'is', null)
    .neq('comment', '')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.flatMap((row) => {
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
}

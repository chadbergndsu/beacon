'use client'

import { useActionState, useState } from 'react'
import {
  submitParentExperienceFeedback,
  type ParentFeedbackState,
} from '@/app/actions/parent-feedback'
import { Button } from '@/components/ui/button'
import { Field, FieldHint } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ParentExperienceRating } from '@/lib/pilot-analytics/parent-feedback'

type InitialResponse = {
  rating: ParentExperienceRating
  comment: string | null
}

export function ParentExperienceFeedback({
  initialResponse,
  unavailable = false,
}: {
  initialResponse: InitialResponse | null
  unavailable?: boolean
}) {
  const initialState: ParentFeedbackState = initialResponse
    ? { rating: initialResponse.rating }
    : {}
  const [state, formAction, pending] = useActionState(
    submitParentExperienceFeedback,
    initialState
  )
  const [selectedRating, setSelectedRating] = useState<ParentExperienceRating | null>(
    initialResponse?.rating ?? null
  )
  const [commentDraft, setCommentDraft] = useState(initialResponse?.comment ?? '')
  const activeRating = state.rating ?? selectedRating

  return (
    <section
      aria-labelledby="parent-experience-prompt"
      className="max-w-2xl rounded-xl border bg-card p-4 shadow-sm sm:p-5"
    >
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="surface" value="parent_dashboard" />
        <div>
          <h2 id="parent-experience-prompt" className="text-base font-semibold text-foreground">
            Was Beacon helpful for understanding school this week?
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="submit"
              name="rating"
              value="helpful"
              variant={activeRating === 'helpful' ? 'primary' : 'outline'}
              className="h-12 min-h-12 px-5"
              aria-pressed={activeRating === 'helpful'}
              disabled={pending || unavailable}
              onClick={() => setSelectedRating('helpful')}
            >
              Yes
            </Button>
            <Button
              type="submit"
              name="rating"
              value="not_yet"
              variant={activeRating === 'not_yet' ? 'primary' : 'outline'}
              className="h-12 min-h-12 px-5"
              aria-pressed={activeRating === 'not_yet'}
              disabled={pending || unavailable}
              onClick={() => setSelectedRating('not_yet')}
            >
              Not yet
            </Button>
          </div>
        </div>

        {selectedRating !== null ? (
          <Field>
            <Label htmlFor="parent-experience-comment">Anything you want us to know?</Label>
            <Textarea
              id="parent-experience-comment"
              name="comment"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value)}
              maxLength={500}
              rows={4}
              disabled={pending || unavailable}
              aria-describedby="parent-experience-comment-hint"
            />
            <FieldHint id="parent-experience-comment-hint">
              Please do not include student names, medical details, or other sensitive information.
            </FieldHint>
          </Field>
        ) : null}

        {pending ? (
          <p role="status" className="text-sm text-muted-foreground">
            Saving your feedback…
          </p>
        ) : state.ok ? (
          <p role="status" className="text-sm text-emerald-800">
            Thank you - your school and the Beacon team can use this to improve the pilot.
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        {unavailable ? (
          <p role="alert" className="text-sm text-danger">
            Weekly feedback is unavailable right now. Please try again later.
          </p>
        ) : null}
      </form>
    </section>
  )
}

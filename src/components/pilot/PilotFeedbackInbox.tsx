'use client'

import { useState, useTransition } from 'react'
import { format } from 'date-fns'
import { updatePilotFeedbackStatusAction } from '@/app/actions/pilot-feedback'
import {
  FEEDBACK_CATEGORY_LABEL,
  FEEDBACK_STATUS_LABEL,
  type FeedbackStatus,
  type PilotFeedback,
} from '@/lib/pilot-feedback/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const STATUSES: FeedbackStatus[] = ['new', 'reviewed', 'planned', 'done', 'wont_do']

export function PilotFeedbackInbox({ initialItems }: { initialItems: PilotFeedback[] }) {
  const [items, setItems] = useState(initialItems)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function setStatus(id: string, status: FeedbackStatus) {
    setError(null)
    start(async () => {
      const result = await updatePilotFeedbackStatusAction({ id, status })
      if (!result.ok) {
        setError(result.error)
        return
      }
      setItems((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))
    })
  }

  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
        No pilot suggestions yet. The floating <strong>Suggestion</strong> button emails the
        Beacon product owner; this list is your school&apos;s copy.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {error}
        </p>
      )}
      <ul className="space-y-3">
        {items.map((item) => (
          <li
            key={item.id}
            className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={item.category === 'issue' ? 'danger' : 'sky'}>
                  {FEEDBACK_CATEGORY_LABEL[item.category]}
                </Badge>
                <Badge variant={item.status === 'new' ? 'warning' : 'muted'}>
                  {FEEDBACK_STATUS_LABEL[item.status]}
                </Badge>
                {item.role && (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.role}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {item.createdAt
                  ? format(new Date(item.createdAt), 'MMM d · h:mm a')
                  : ''}
              </p>
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap text-foreground leading-relaxed">
              {item.message}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              {(item.submitterName || item.submitterEmail) && (
                <span>
                  From:{' '}
                  <strong className="text-foreground">
                    {item.submitterName || item.submitterEmail}
                  </strong>
                  {item.submitterName && item.submitterEmail
                    ? ` · ${item.submitterEmail}`
                    : null}
                </span>
              )}
              {item.pagePath && (
                <span>
                  Page: <code className="rounded bg-muted px-1">{item.pagePath}</code>
                </span>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {STATUSES.map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={item.status === s ? 'primary' : 'outline'}
                  disabled={pending || item.status === s}
                  onClick={() => setStatus(item.id, s)}
                >
                  {FEEDBACK_STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

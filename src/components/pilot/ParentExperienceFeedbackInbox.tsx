import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import type { ParentExperienceFeedbackItem } from '@/lib/pilot-analytics/parent-feedback'

export function ParentExperienceFeedbackInbox({
  initialItems,
}: {
  initialItems: ParentExperienceFeedbackItem[]
}) {
  return (
    <section aria-labelledby="parent-experience-heading" className="space-y-3">
      <div>
        <h2 id="parent-experience-heading" className="text-lg font-semibold tracking-tight">
          Parent experience
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Recent optional comments from the weekly parent helpfulness check.
        </p>
      </div>

      {initialItems.length === 0 ? (
        <p className="rounded-xl border border-dashed bg-card p-6 text-sm text-muted-foreground">
          No parent comments yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {initialItems.map((item) => (
            <li key={item.id} className="rounded-lg border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge variant={item.rating === 'helpful' ? 'outline' : 'warning'}>
                  {item.rating === 'helpful' ? 'Helpful' : 'Not yet'}
                </Badge>
                <time
                  dateTime={item.created_at}
                  className="text-xs text-muted-foreground"
                >
                  {format(new Date(item.created_at), 'MMM d, yyyy')}
                </time>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {item.comment}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

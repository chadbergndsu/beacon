import { format } from 'date-fns'
import { kindLabel, kindTone } from '@/lib/comms/desk'
import { Badge } from '@/components/ui/badge'

export type NoteTimelineItem = {
  id: string
  direction: 'out' | 'in'
  subject: string
  body_text: string
  created_at: string
  status: string
  kind?: string
  from_label?: string
}

/**
 * Kind-aware note timeline — shared by parent Messages and staff thread peeks.
 * Not a chat bubble UI: calm school ↔ family notes.
 */
export function NoteTimeline({
  items,
  emptyTitle = 'No notes yet',
  emptyDescription = 'When the school writes home, the conversation appears here.',
}: {
  items: NoteTimelineItem[]
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-10 text-center">
        <p className="text-sm font-medium text-foreground">{emptyTitle}</p>
        <p className="mt-1 text-xs text-muted-foreground">{emptyDescription}</p>
      </div>
    )
  }

  return (
    <ol className="relative space-y-4 border-l border-border/80 pl-5 sm:pl-6">
      {items.map((m, i) => {
        const out = m.direction === 'out'
        const tone = kindTone(m.kind)
        return (
          <li
            key={m.id}
            className="animate-beacon-in relative"
            style={{ animationDelay: `${Math.min(i, 8) * 35}ms` }}
          >
            <span
              className={
                out
                  ? 'absolute -left-[1.4rem] top-3 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-background sm:-left-[1.65rem]'
                  : 'absolute -left-[1.4rem] top-3 h-2.5 w-2.5 rounded-full bg-success ring-4 ring-background sm:-left-[1.65rem]'
              }
              aria-hidden
            />
            <article
              className={
                out
                  ? 'rounded-2xl border border-border/80 bg-card p-4 shadow-[var(--shadow-soft)]'
                  : 'rounded-2xl border border-emerald-200/70 bg-success-soft/40 p-4'
              }
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={out ? tone : 'success'}>
                  {out ? kindLabel(m.kind) : 'Your reply'}
                </Badge>
                {m.from_label ? (
                  <span className="text-[11px] text-muted-foreground">{m.from_label}</span>
                ) : null}
                <time className="ml-auto text-[11px] text-muted-foreground">
                  {safeFormat(m.created_at)}
                </time>
              </div>
              <h3 className="mt-2 text-sm font-semibold tracking-tight text-foreground">
                {m.subject}
              </h3>
              <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-muted-foreground">
                {m.body_text.slice(0, 2800)}
                {m.body_text.length > 2800 ? '…' : ''}
              </pre>
              {out && m.status !== 'sent' ? (
                <p className="mt-2 text-[11px] font-medium text-warning">Delivery: {m.status}</p>
              ) : null}
            </article>
          </li>
        )
      })}
    </ol>
  )
}

function safeFormat(iso: string) {
  try {
    return format(new Date(iso), 'MMM d · h:mm a')
  } catch {
    return iso.slice(0, 16)
  }
}

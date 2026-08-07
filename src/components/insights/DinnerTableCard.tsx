import { MessageCircle, Sparkles, Eye, Utensils } from 'lucide-react'
import type { DinnerTableDigest } from '@/lib/insights/dinner-table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function DinnerTableCard({
  digest,
  emailAction,
}: {
  digest: DinnerTableDigest
  /** Staff-only: Email digest CTA on the card (parents never see this). */
  emailAction?: React.ReactNode
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Utensils className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                Dinner Table Digest
              </p>
              <h2 className="text-lg font-semibold leading-tight tracking-tight">
                Talk about school in 60 seconds
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {digest.studentName}
                {digest.gradeLevel ? ` · Grade ${digest.gradeLevel}` : ''} · {digest.weekLabel}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Badge variant="muted" className="shrink-0">
              Family exclusive
            </Badge>
            {emailAction}
          </div>
        </div>
      </div>
      <CardContent className="space-y-5 pt-5">
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success">
            <Sparkles className="h-3.5 w-3.5" />
            Celebrate
          </h3>
          {digest.celebrate.length ? (
            <ul className="mt-2 space-y-1.5">
              {digest.celebrate.map((line) => (
                <li
                  key={line}
                  className="rounded-xl border border-success/20 bg-success-soft/60 px-3 py-2 text-sm"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No new wins logged yet — teachers add these via Beacon Pulse.
            </p>
          )}
        </section>

        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
            <Eye className="h-3.5 w-3.5" />
            Gently watch
          </h3>
          {digest.watch.length ? (
            <ul className="mt-2 space-y-1.5">
              {digest.watch.map((line) => (
                <li
                  key={line}
                  className="rounded-xl border border-warning/25 bg-warning-soft/50 px-3 py-2 text-sm"
                >
                  {line}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Nothing flagged — enjoy the calm.</p>
          )}
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Grades snapshot
            </p>
            <p className="mt-1 text-sm leading-relaxed">{digest.gradesLine}</p>
          </div>
          <div className="rounded-xl border border-border/80 bg-muted/30 px-3.5 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Presence
            </p>
            <p className="mt-1 text-sm leading-relaxed">{digest.presenceLine}</p>
          </div>
        </div>

        {digest.comingUp.length > 0 ? (
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-primary">Coming up</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {digest.comingUp.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
          <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
            <MessageCircle className="h-3.5 w-3.5" />
            Ask at dinner
          </h3>
          <ol className="mt-2 space-y-2">
            {digest.conversationStarters.map((q, i) => (
              <li key={q} className="flex gap-2 text-sm">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
                  {i + 1}
                </span>
                <span className="pt-0.5 leading-snug">{q}</span>
              </li>
            ))}
          </ol>
        </section>
      </CardContent>
    </Card>
  )
}

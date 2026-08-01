import { MessageCircle, Sparkles, Eye, Utensils } from 'lucide-react'
import type { DinnerTableDigest } from '@/lib/insights/dinner-table'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function DinnerTableCard({ digest }: { digest: DinnerTableDigest }) {
  return (
    <Card className="overflow-hidden border-amber-200/80 shadow-[var(--shadow-soft)] dark:border-amber-900/40">
      <div className="border-b border-amber-100 bg-gradient-to-r from-amber-50 via-orange-50 to-white px-5 py-4 dark:from-amber-950/40 dark:via-orange-950/20 dark:to-slate-900 dark:border-amber-900/40">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/25">
              <Utensils className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-300">
                Exclusive · Dinner Table Digest
              </p>
              <h2 className="text-lg font-bold text-navy dark:text-sky-50 leading-tight">
                Talk about school in 60 seconds
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {digest.studentName}
                {digest.gradeLevel ? ` · Grade ${digest.gradeLevel}` : ''} · {digest.weekLabel}
              </p>
            </div>
          </div>
          <Badge variant="warning" className="shrink-0">
                Not in FACTS / Jupiter
          </Badge>
        </div>
      </div>
      <CardContent className="pt-5 space-y-5">
        <section>
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
            <Sparkles className="h-3.5 w-3.5" />
            Celebrate
          </h3>
          {digest.celebrate.length ? (
            <ul className="mt-2 space-y-1.5">
              {digest.celebrate.map((line) => (
                <li
                  key={line}
                  className="rounded-xl bg-emerald-50/80 px-3 py-2 text-sm text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100"
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
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
            <Eye className="h-3.5 w-3.5" />
            Gently watch
          </h3>
          {digest.watch.length ? (
            <ul className="mt-2 space-y-1.5">
              {digest.watch.map((line) => (
                <li
                  key={line}
                  className="rounded-xl bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:bg-amber-950/30 dark:text-amber-100"
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
          <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Grades snapshot
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{digest.gradesLine}</p>
          </div>
          <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Presence
            </p>
            <p className="mt-1 text-sm leading-relaxed text-foreground">{digest.presenceLine}</p>
          </div>
        </div>

        {digest.comingUp.length > 0 && (
          <section>
            <h3 className="text-xs font-bold uppercase tracking-wide text-sky-700 dark:text-sky-400">
              Coming up
            </h3>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-foreground">
              {digest.comingUp.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="rounded-2xl border border-sky-200/70 bg-sky-50/60 px-4 py-3.5 dark:border-sky-900 dark:bg-sky-950/30">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300">
            <MessageCircle className="h-3.5 w-3.5" />
            Ask at dinner
          </h3>
          <ol className="mt-2 space-y-2">
            {digest.conversationStarters.map((q, i) => (
              <li key={q} className="flex gap-2 text-sm text-sky-950 dark:text-sky-100">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sky-600 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="leading-snug pt-0.5">{q}</span>
              </li>
            ))}
          </ol>
        </section>
      </CardContent>
    </Card>
  )
}

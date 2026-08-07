import Link from 'next/link'
import { AlertCircle, CalendarClock, ClipboardList } from 'lucide-react'
import type { MissingWorkSummary } from '@/lib/insights/missing-work'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function MissingWorkRadar({
  summaries,
  title = 'Missing Work Radar',
}: {
  summaries: MissingWorkSummary[]
  title?: string
}) {
  const totalMissing = summaries.reduce((n, s) => n + s.missingCount, 0)
  const totalUpcoming = summaries.reduce((n, s) => n + s.upcomingCount, 0)

  if (!summaries.length) return null

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning text-white">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warning">
                Missing work
              </p>
              <h2 className="text-lg font-semibold leading-tight tracking-tight">{title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Past-due and unscored only — future due dates stay in “coming up.”
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={totalMissing > 0 ? 'danger' : 'success'}>{totalMissing} missing</Badge>
            <Badge variant="muted">{totalUpcoming} upcoming</Badge>
          </div>
        </div>
      </div>
      <CardContent className="space-y-5 pt-4">
        {totalMissing === 0 && totalUpcoming === 0 ? (
          <p className="rounded-xl border border-success/20 bg-success-soft/60 px-3 py-2.5 text-sm">
            All caught up — no missing or upcoming unscored work.
          </p>
        ) : (
          summaries.map((s) => (
            <div key={s.studentId} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/students/${s.studentId}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {s.studentName}
                </Link>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {s.missingCount} missing · {s.upcomingCount} upcoming
                </span>
              </div>

              {s.missing.length > 0 ? (
                <ul className="space-y-1.5">
                  {s.missing.slice(0, 6).map((m) => (
                    <li
                      key={m.assignmentId}
                      className="flex items-start gap-2 rounded-xl border border-danger/20 bg-danger-soft/50 px-3 py-2 text-sm"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.className}
                          {m.dueDate ? ` · due ${m.dueDate}` : ' · no due date'}
                        </p>
                      </div>
                    </li>
                  ))}
                  {s.missing.length > 6 ? (
                    <li className="pl-6 text-xs text-muted-foreground">
                      +{s.missing.length - 6} more
                    </li>
                  ) : null}
                </ul>
              ) : null}

              {s.upcoming.length > 0 ? (
                <ul className="space-y-1.5">
                  {s.upcoming.slice(0, 3).map((m) => (
                    <li
                      key={m.assignmentId}
                      className="flex items-start gap-2 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2 text-sm"
                    >
                      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.className} · due {m.dueDate}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

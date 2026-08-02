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
    <Card className="overflow-hidden border-rose-200/70 dark:border-rose-900/40">
      <div className="border-b border-rose-100 bg-gradient-to-r from-rose-50 via-orange-50 to-white px-5 py-4 dark:from-rose-950/40 dark:via-orange-950/20 dark:to-slate-900 dark:border-rose-900/40">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white shadow-md shadow-rose-500/25">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rose-800 dark:text-rose-300">
                Market edge · calm missing-work view
              </p>
              <h2 className="text-lg font-bold text-navy dark:text-sky-50 leading-tight">
                {title}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Past-due and unscored work only — future due dates stay in “coming up,” not panic.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={totalMissing > 0 ? 'danger' : 'success'}>
              {totalMissing} missing
            </Badge>
            <Badge variant="sky">{totalUpcoming} upcoming</Badge>
          </div>
        </div>
      </div>
      <CardContent className="pt-4 space-y-5">
        {totalMissing === 0 && totalUpcoming === 0 ? (
          <p className="text-sm text-muted-foreground rounded-xl bg-emerald-50/80 px-3 py-2.5 dark:bg-emerald-950/30">
            All caught up — no missing or upcoming unscored work.
          </p>
        ) : (
          summaries.map((s) => (
            <div key={s.studentId} className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/students/${s.studentId}`}
                  className="font-semibold text-sky-800 hover:underline dark:text-sky-300"
                >
                  {s.studentName}
                </Link>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {s.missingCount} missing · {s.upcomingCount} upcoming
                </span>
              </div>

              {s.missing.length > 0 && (
                <ul className="space-y-1.5">
                  {s.missing.slice(0, 6).map((m) => (
                    <li
                      key={m.assignmentId}
                      className="flex items-start gap-2 rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-2 text-sm dark:border-rose-900/40 dark:bg-rose-950/20"
                    >
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.className}
                          {m.dueDate ? ` · due ${m.dueDate}` : ' · no due date'}
                        </p>
                      </div>
                    </li>
                  ))}
                  {s.missing.length > 6 && (
                    <li className="text-xs text-muted-foreground pl-6">
                      +{s.missing.length - 6} more
                    </li>
                  )}
                </ul>
              )}

              {s.upcoming.length > 0 && (
                <ul className="space-y-1.5">
                  {s.upcoming.slice(0, 3).map((m) => (
                    <li
                      key={m.assignmentId}
                      className="flex items-start gap-2 rounded-xl border border-sky-100 bg-sky-50/40 px-3 py-2 text-sm dark:border-sky-900/40 dark:bg-sky-950/20"
                    >
                      <CalendarClock className="h-4 w-4 shrink-0 text-sky-600 mt-0.5" />
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">{m.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.className} · due {m.dueDate}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}

import Link from 'next/link'
import { Activity, AlertTriangle, Heart } from 'lucide-react'
import type { BeaconSignal, SignalLevel } from '@/lib/insights/beacon-signal'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function levelStyles(level: SignalLevel) {
  switch (level) {
    case 'thriving':
      return {
        ring: 'stroke-emerald-500',
        text: 'text-emerald-700 dark:text-emerald-300',
        badge: 'success' as const,
      }
    case 'steady':
      return {
        ring: 'stroke-sky-500',
        text: 'text-sky-700 dark:text-sky-300',
        badge: 'sky' as const,
      }
    case 'watch':
      return {
        ring: 'stroke-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
        badge: 'warning' as const,
      }
    default:
      return {
        ring: 'stroke-red-500',
        text: 'text-red-700 dark:text-red-300',
        badge: 'danger' as const,
      }
  }
}

function Ring({ score, className }: { score: number; className: string }) {
  const r = 42
  const c = 2 * Math.PI * r
  const offset = c - (score / 100) * c
  return (
    <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0" aria-hidden>
      <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-200 dark:text-slate-700" />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        className={cn(className, 'transition-all duration-700')}
        transform="rotate(-90 50 50)"
      />
      <text
        x="50"
        y="54"
        textAnchor="middle"
        className="fill-current text-[22px] font-bold"
        style={{ fontSize: '22px', fontWeight: 700 }}
      >
        {score}
      </text>
    </svg>
  )
}

export function BeaconSignalCard({ signal }: { signal: BeaconSignal }) {
  const styles = levelStyles(signal.level)

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border/70 bg-muted/30 px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h2 className="font-semibold tracking-tight">Beacon Signal</h2>
            <Badge variant={styles.badge}>{signal.level}</Badge>
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            School climate
          </p>
        </div>
      </div>
      <CardContent className="pt-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className={cn('flex items-center gap-4', styles.text)}>
            <Ring score={signal.score} className={styles.ring} />
            <div className="min-w-0">
              <p className="text-lg font-semibold leading-snug tracking-tight">{signal.headline}</p>
              <p className="mt-1 text-sm text-muted-foreground">{signal.summary}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { k: 'Care pulses', v: signal.metrics.pulseCareCount },
            { k: 'Strong pulses', v: signal.metrics.pulseStrongCount },
            { k: 'Absences', v: signal.metrics.recentAbsences },
            { k: 'Missing work', v: signal.metrics.studentsWithMissingWork },
          ].map((m) => (
            <div key={m.k} className="rounded-xl border border-border/80 bg-muted/25 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {m.k}
              </p>
              <p className="text-xl font-semibold tabular-nums tracking-tight">{m.v}</p>
            </div>
          ))}
        </div>

        {signal.watchList.length > 0 ? (
          <div className="mt-5">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning">
              <AlertTriangle className="h-3.5 w-3.5" />
              Pastoral watch list
            </h3>
            <ul className="mt-2 divide-y divide-border/70 rounded-xl border border-border/80">
              {signal.watchList.map((s) => (
                <li key={s.studentId} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/students/${s.studentId}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {s.studentName}
                    </Link>
                    {s.gradeLevel ? (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        Gr. {s.gradeLevel}
                      </span>
                    ) : null}
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{s.reason}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                    {s.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {signal.wins.length > 0 ? (
          <div className="mt-4 rounded-xl border border-success/20 bg-success-soft/60 px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success">
              <Heart className="h-3.5 w-3.5" />
              Wins
            </p>
            <ul className="mt-1.5 space-y-1 text-sm">
              {signal.wins.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

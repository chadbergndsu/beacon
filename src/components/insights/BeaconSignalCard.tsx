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
        glow: 'from-emerald-50 to-white dark:from-emerald-950/40',
      }
    case 'steady':
      return {
        ring: 'stroke-sky-500',
        text: 'text-sky-700 dark:text-sky-300',
        badge: 'sky' as const,
        glow: 'from-sky-50 to-white dark:from-sky-950/40',
      }
    case 'watch':
      return {
        ring: 'stroke-amber-500',
        text: 'text-amber-700 dark:text-amber-300',
        badge: 'warning' as const,
        glow: 'from-amber-50 to-white dark:from-amber-950/40',
      }
    default:
      return {
        ring: 'stroke-red-500',
        text: 'text-red-700 dark:text-red-300',
        badge: 'danger' as const,
        glow: 'from-red-50 to-white dark:from-red-950/40',
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
    <Card className="overflow-hidden border-violet-200/70 dark:border-violet-900/50">
      <div
        className={cn(
          'border-b border-border bg-gradient-to-r px-5 py-4',
          styles.glow
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-violet-600" />
            <h2 className="font-semibold text-navy dark:text-sky-50">Beacon Signal</h2>
            <Badge variant={styles.badge}>{signal.level}</Badge>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:text-violet-300">
            Exclusive · school heart rate
          </p>
        </div>
      </div>
      <CardContent className="pt-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className={cn('flex items-center gap-4', styles.text)}>
            <Ring score={signal.score} className={styles.ring} />
            <div className="min-w-0">
              <p className="text-lg font-bold text-navy dark:text-sky-50 leading-snug">
                {signal.headline}
              </p>
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
            <div key={m.k} className="rounded-xl border border-border bg-muted/25 px-3 py-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {m.k}
              </p>
              <p className="text-xl font-bold tabular-nums text-navy dark:text-sky-50">{m.v}</p>
            </div>
          ))}
        </div>

        {signal.watchList.length > 0 && (
          <div className="mt-5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" />
              Pastoral watch list
            </h3>
            <ul className="mt-2 divide-y divide-border rounded-xl border">
              {signal.watchList.map((s) => (
                <li key={s.studentId} className="flex items-start justify-between gap-3 px-3 py-2.5">
                  <div className="min-w-0">
                    <Link
                      href={`/students/${s.studentId}`}
                      className="font-semibold text-sky-800 hover:underline dark:text-sky-300"
                    >
                      {s.studentName}
                    </Link>
                    {s.gradeLevel && (
                      <span className="ml-1.5 text-xs text-muted-foreground">
                        Gr. {s.gradeLevel}
                      </span>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{s.reason}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-xs font-bold text-muted-foreground">
                    {s.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {signal.wins.length > 0 && (
          <div className="mt-4 rounded-xl bg-emerald-50/70 px-3.5 py-3 dark:bg-emerald-950/25">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
              <Heart className="h-3.5 w-3.5" />
              Wins
            </p>
            <ul className="mt-1.5 space-y-1 text-sm text-emerald-950 dark:text-emerald-100">
              {signal.wins.map((w) => (
                <li key={w}>• {w}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

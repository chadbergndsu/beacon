'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Sparkles,
  Star,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { TransparentResult } from '@/lib/types'

interface Props {
  result: TransparentResult
  studentName: string
  className?: string
  photoUrl?: string | null
  compact?: boolean
}

function letterTone(letter: string | null) {
  if (!letter) return 'bg-muted text-muted-foreground'
  const L = letter[0]
  if (L === 'A') return 'bg-success text-white'
  if (L === 'B') return 'bg-primary text-primary-foreground'
  if (L === 'C') return 'bg-warning text-white'
  if (L === 'D') return 'bg-orange-500 text-white'
  return 'bg-danger text-white'
}

export function TransparentGradeView({
  result,
  studentName,
  className = '',
  photoUrl,
  compact = false,
}: Props) {
  const [openCats, setOpenCats] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {}
    result.breakdown.forEach((c, i) => {
      init[c.name] = i === 0
    })
    return init
  })

  const initials = studentName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')

  const toggle = (name: string) =>
    setOpenCats((prev) => ({ ...prev, [name]: !prev[name] }))

  return (
    <div className={cn('space-y-5 animate-beacon-in', className)}>
      <Card className={cn('overflow-hidden', compact ? '' : '')}>
        <CardContent
          className={cn('flex flex-wrap items-center gap-5', compact ? 'pt-5' : 'pt-6 sm:pt-7')}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={studentName}
              className={cn(
                'rounded-xl object-cover border border-border',
                compact ? 'h-12 w-12' : 'h-16 w-16'
              )}
            />
          ) : (
            <div
              className={cn(
                'flex items-center justify-center rounded-xl bg-navy font-semibold text-white',
                compact ? 'h-12 w-12 text-base' : 'h-16 w-16 text-xl'
              )}
            >
              {initials || studentName.charAt(0)}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Current grade
            </p>
            <h1
              className={cn(
                'truncate font-semibold tracking-tight',
                compact ? 'text-lg' : 'text-xl sm:text-2xl'
              )}
            >
              {studentName}
            </h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Transparent calculation — same math teachers use
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div
              className={cn(
                'flex flex-col items-center justify-center rounded-2xl shadow-sm',
                letterTone(result.letter),
                compact ? 'h-16 w-16' : 'h-20 w-20'
              )}
            >
              <div
                className={cn(
                  'font-semibold tabular-nums leading-none tracking-tight',
                  compact ? 'text-xl' : 'text-2xl'
                )}
              >
                {result.overall != null ? result.overall : '—'}
              </div>
              {result.overall != null ? (
                <div className="text-[9px] font-semibold uppercase tracking-wider opacity-90">
                  %
                </div>
              ) : null}
            </div>
            {result.letter ? (
              <div className="text-center">
                <div
                  className={cn(
                    'font-semibold leading-none tracking-tight',
                    compact ? 'text-3xl' : 'text-4xl'
                  )}
                >
                  {result.letter}
                </div>
                <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Letter
                </p>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="flex items-start gap-3 border-b border-border/70 bg-muted/30 px-5 py-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold tracking-tight">How this grade was calculated</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Category averages × weights — never a black box
            </p>
          </div>
        </div>
        <CardContent className="pt-4">
          <div className="rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3">
            <p className="break-words font-mono text-[13px] leading-relaxed sm:text-sm">
              {result.formula}
            </p>
          </div>
          {result.missingCount > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-warning-soft/80 px-3 py-2.5 text-sm text-amber-900 dark:border-amber-800 dark:text-amber-100">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                <strong>
                  {result.missingCount} missing assignment
                  {result.missingCount > 1 ? 's' : ''}
                </strong>{' '}
                counted as 0% in the average.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Category breakdown */}
      <div>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-muted-foreground">
            Category breakdown
          </h3>
          <p className="text-xs text-muted-foreground">Tap a category to see assignments</p>
        </div>

        {result.breakdown.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              No graded categories yet. Scores will appear here as soon as they&apos;re entered.
            </p>
          </Card>
        ) : (
          <div className="grid gap-3">
            {result.breakdown.map((cat) => {
              const open = openCats[cat.name]
              const hasAssignments = (cat.assignments?.length ?? 0) > 0
              const contribPct =
                result.overall && cat.contribution != null && result.overall > 0
                  ? Math.min(100, Math.round((cat.contribution / result.overall) * 100))
                  : cat.weight

              return (
                <Card
                  key={cat.name}
                  className={cn(
                    'overflow-hidden transition-shadow duration-200',
                    open && 'shadow-[var(--shadow-lift)] border-sky-200/80 dark:border-sky-800'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => hasAssignments && toggle(cat.name)}
                    className={cn(
                      'w-full text-left px-5 py-4 flex flex-wrap items-center gap-4',
                      'hover:bg-sky-50/50 dark:hover:bg-sky-950/30 transition-colors',
                      hasAssignments ? 'cursor-pointer' : 'cursor-default'
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                      {hasAssignments ? (
                        open ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )
                      ) : (
                        <CircleDot className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-semibold text-navy dark:text-sky-50">{cat.name}</h4>
                        <Badge variant="sky">{cat.weight}% of grade</Badge>
                        {cat.dropped > 0 && (
                          <Badge variant="muted">Dropped {cat.dropped} lowest</Badge>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {cat.count} score{cat.count === 1 ? '' : 's'}
                        {cat.contribution != null && (
                          <>
                            {' '}
                            · contributes{' '}
                            <strong className="text-foreground">{cat.contribution}</strong> pts to
                            overall
                          </>
                        )}
                      </p>
                      <div className="mt-2.5 h-1.5 max-w-xs rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-sky-600 transition-all duration-500"
                          style={{
                            width: `${cat.average != null ? Math.min(100, cat.average) : 0}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold tabular-nums text-navy dark:text-sky-50">
                        {cat.average != null ? `${cat.average}%` : '—'}
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground">
                        category avg
                      </div>
                    </div>
                  </button>

                  {open && hasAssignments && (
                    <div className="border-t border-border bg-slate-50/60 dark:bg-slate-900/40 px-3 py-2 sm:px-4">
                      <ul className="divide-y divide-border/70">
                        {cat.assignments!.map((a, idx) => (
                          <li
                            key={`${a.title}-${idx}`}
                            className="flex flex-wrap items-center justify-between gap-2 py-2.5 px-2"
                          >
                            <div className="min-w-0 flex items-start gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {a.title}
                                </p>
                                <div className="mt-1 flex flex-wrap gap-1.5">
                                  {a.missing && <Badge variant="warning">Missing</Badge>}
                                  {a.extra && (
                                    <Badge variant="sky">
                                      <Star className="h-3 w-3" />
                                      Extra credit
                                    </Badge>
                                  )}
                                  {a.dropped && <Badge variant="muted">Dropped</Badge>}
                                </div>
                              </div>
                            </div>
                            <div className="text-right tabular-nums shrink-0">
                              <div className="text-sm font-semibold">
                                {a.missing ? (
                                  <span className="text-warning">M</span>
                                ) : a.score != null ? (
                                  <>
                                    {a.score}
                                    <span className="text-muted-foreground font-normal">
                                      /{a.max}
                                    </span>
                                  </>
                                ) : (
                                  '—'
                                )}
                              </div>
                              <div
                                className={cn(
                                  'text-xs font-medium',
                                  a.missing
                                    ? 'text-warning'
                                    : a.pct >= 90
                                      ? 'text-success'
                                      : a.pct >= 70
                                        ? 'text-sky-700 dark:text-sky-300'
                                        : 'text-muted-foreground'
                                )}
                              >
                                {a.missing ? '0%' : `${a.pct}%`}
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {/* Weight contribution hint */}
                      <div className="mt-1 mb-2 px-2 text-[11px] text-muted-foreground">
                        Weight share of overall ≈ {contribPct}% of final when categories are complete
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

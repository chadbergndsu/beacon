'use client'

import Link from 'next/link'
import type { PilotPathStatus } from '@/lib/ops/pilot-path'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { buttonClassName } from '@/components/ui/button'

export function PilotPathCard({
  statuses,
  nextHref,
}: {
  statuses: PilotPathStatus[]
  nextHref?: string | null
}) {
  const done = statuses.filter((s) => s.done).length
  const next = statuses.find((s) => !s.done)

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              Soft pilot path
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              Shore up before families
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Ordered launch steps — finish these before inviting parents.
            </p>
          </div>
          <Badge variant={done === statuses.length ? 'success' : 'sky'}>
            {done}/{statuses.length}
          </Badge>
        </div>

        <ol className="space-y-2">
          {statuses.map(({ step, done: isDone }) => (
            <li
              key={step.id}
              className={
                isDone
                  ? 'rounded-lg border border-emerald-200/80 bg-emerald-50/60 px-3 py-2.5 dark:border-emerald-900 dark:bg-emerald-950/30'
                  : next?.step.id === step.id
                    ? 'rounded-lg border border-primary/40 bg-card px-3 py-2.5 shadow-sm'
                    : 'rounded-lg border border-border/70 bg-card/60 px-3 py-2.5'
              }
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {isDone ? '✓ ' : next?.step.id === step.id ? '→ ' : ''}
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                    {step.detail}
                  </p>
                </div>
                {step.href && !isDone ? (
                  <Link href={step.href} className={buttonClassName('outline', 'sm')}>
                    Open
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ol>

        {next ? (
          <p className="text-sm text-foreground">
            <strong>Next:</strong> {next.step.title}
            {nextHref || next.step.href ? (
              <>
                {' · '}
                <Link
                  href={nextHref || next.step.href!}
                  className="font-semibold text-primary hover:underline"
                >
                  Continue
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
            Soft pilot path complete — proceed when leadership is ready.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

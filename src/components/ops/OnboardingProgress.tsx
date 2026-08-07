import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import type { OnboardingStatus } from '@/lib/ops/onboarding'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function OnboardingProgress({
  status,
  parentPilotReady,
}: {
  status: OnboardingStatus
  parentPilotReady: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-5 py-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Launch essentials
          </p>
          <h3 className="font-medium text-foreground">Core pilot setup</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.core.percent === 100 ? 'success' : 'warning'}>
            {status.core.percent}% core setup
          </Badge>
          {parentPilotReady ? (
            <Badge variant="success">Approved for parent pilot</Badge>
          ) : (
            <Badge variant="muted">Parent pilot approval incomplete</Badge>
          )}
        </div>
      </div>
      <CardContent className="pt-4">
        <div className="mb-4 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${status.core.percent}%` }}
          />
        </div>
        <ul className="space-y-2">
          {status.core.steps.map((s) => (
            <li key={s.id} className="flex items-start gap-2.5 text-sm">
              {s.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
              )}
              <div className="min-w-0">
                <Link href={s.href} className="font-medium hover:text-primary hover:underline">
                  {s.label}
                </Link>
                <p className="text-xs text-muted-foreground">{s.detail}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-medium text-foreground">Optional campus tools</p>
              <p className="text-xs text-muted-foreground">
                Add these when they support your rollout. They do not reduce core readiness.
              </p>
            </div>
            <Badge variant="muted">
              {status.optional.complete}/{status.optional.total} enabled
            </Badge>
          </div>
          <ul className="space-y-2">
            {status.optional.steps.map((s) => (
              <li key={s.id} className="flex items-start gap-2.5 text-sm">
                {s.done ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                ) : (
                  <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <div className="min-w-0">
                  <Link href={s.href} className="font-medium hover:text-primary hover:underline">
                    {s.label}
                  </Link>
                  <p className="text-xs text-muted-foreground">{s.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

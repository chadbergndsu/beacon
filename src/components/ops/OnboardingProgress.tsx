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
            First-run setup
          </p>
          <h3 className="font-medium text-foreground">School onboarding</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.percent === 100 ? 'success' : 'warning'}>
            {status.percent}% setup
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
            style={{ width: `${status.percent}%` }}
          />
        </div>
        <ul className="space-y-2">
          {status.steps.map((s) => (
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
      </CardContent>
    </Card>
  )
}

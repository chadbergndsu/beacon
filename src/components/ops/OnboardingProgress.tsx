import Link from 'next/link'
import { CheckCircle2, Circle } from 'lucide-react'
import type { OnboardingStatus } from '@/lib/ops/onboarding'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function OnboardingProgress({ status }: { status: OnboardingStatus }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-border bg-muted/30 px-5 py-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">
            First-run setup
          </p>
          <h3 className="font-semibold text-navy dark:text-sky-50">School onboarding</h3>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={status.readyForParents ? 'success' : 'warning'}>
            {status.percent}% ready
          </Badge>
          {status.readyForParents ? (
            <Badge variant="success">OK for pilot parents</Badge>
          ) : (
            <Badge variant="muted">Not parent-ready yet</Badge>
          )}
        </div>
      </div>
      <CardContent className="pt-4">
        <div className="mb-4 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-sky-500 transition-all"
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
                <Link href={s.href} className="font-semibold hover:text-sky-700 hover:underline">
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

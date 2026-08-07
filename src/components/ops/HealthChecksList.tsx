import type { HealthCheck, CheckStatus } from '@/lib/ops/health'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function variant(status: CheckStatus): 'success' | 'warning' | 'danger' | 'sky' | 'muted' {
  if (status === 'ok') return 'success'
  if (status === 'warn') return 'warning'
  if (status === 'fail') return 'danger'
  if (status === 'info') return 'sky'
  return 'muted'
}

export function HealthChecksList({ checks }: { checks: HealthCheck[] }) {
  const categories = [
    { id: 'platform', title: 'Platform' },
    { id: 'data', title: 'Database' },
    { id: 'integrations', title: 'Integrations' },
    { id: 'trust', title: 'Roster & trust' },
  ] as const

  return (
    <div className="space-y-5">
      {categories.map((cat) => {
        const list = checks.filter((c) => c.category === cat.id)
        if (!list.length) return null
        return (
          <section key={cat.id}>
            <h3 className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {cat.title}
            </h3>
            <ul className="mt-2 divide-y divide-border rounded-lg border">
              {list.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    'flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{c.label}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{c.detail}</p>
                  </div>
                  <Badge variant={variant(c.status)} className="w-fit shrink-0 uppercase">
                    {c.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

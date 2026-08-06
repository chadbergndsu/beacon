import Link from 'next/link'
import { format } from 'date-fns'
import type { FeedItem } from '@/lib/parent-feed'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'

const TYPE_LABEL: Record<FeedItem['type'], string> = {
  announcement: 'Announcement',
  pulse: 'Pulse',
  attendance: 'Attendance',
  invoice: 'Billing',
  grade: 'Grade',
  missing: 'Missing work',
}

function toneClasses(tone?: FeedItem['tone']) {
  if (tone === 'warning') return 'border-warning/30 bg-warning-soft/40'
  if (tone === 'success') return 'border-success/25 bg-success-soft/50'
  if (tone === 'info') return 'border-primary/20 bg-primary/5'
  return 'border-border/80 bg-card'
}

export function ParentFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        title="Family feed is quiet"
        description="Grades, Beacon Pulse, attendance, and announcements will show up here."
      />
    )
  }

  return (
    <div className="space-y-3 animate-beacon-in">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold tracking-tight">Family feed</h2>
        <Badge variant="muted">{items.length} updates</Badge>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="block">
              <Card className={cn('card-interactive transition', toneClasses(item.tone))}>
                <CardContent className="flex flex-wrap items-start justify-between gap-3 pt-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted" className="text-[10px]">
                        {TYPE_LABEL[item.type]}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {safeFormat(item.at)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm font-semibold">{item.title}</p>
                    {item.body ? (
                      <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                        {item.body}
                      </p>
                    ) : null}
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-primary">View →</span>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

function safeFormat(iso: string) {
  try {
    return format(new Date(iso), 'MMM d · h:mm a')
  } catch {
    return iso.slice(0, 10)
  }
}

import Link from 'next/link'
import { format } from 'date-fns'
import type { FeedItem } from '@/lib/parent-feed'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  if (tone === 'warning') return 'border-amber-200/80 bg-amber-50/40 dark:bg-amber-950/20'
  if (tone === 'success') return 'border-emerald-200/80 bg-emerald-50/30 dark:bg-emerald-950/20'
  if (tone === 'info') return 'border-sky-200/80 bg-sky-50/40 dark:bg-sky-950/20'
  return 'border-border bg-card'
}

export function ParentFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Your family feed is quiet. Grades, Beacon Pulse, attendance, and announcements will show
          up here.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 animate-beacon-in">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-navy dark:text-sky-50">Family feed</h2>
        <Badge variant="sky">{items.length} updates</Badge>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href}>
              <Card
                className={cn(
                  'card-interactive transition',
                  toneClasses(item.tone)
                )}
              >
                <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="muted" className="text-[10px]">
                        {TYPE_LABEL[item.type]}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {safeFormat(item.at)}
                      </span>
                    </div>
                    <p className="mt-1.5 font-semibold text-sm text-navy dark:text-sky-50">
                      {item.title}
                    </p>
                    {item.body && (
                      <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
                        {item.body}
                      </p>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-sky-700 shrink-0">View →</span>
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

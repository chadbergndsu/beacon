import Link from 'next/link'
import { format } from 'date-fns'
import type { FeedItem } from '@/lib/parent-feed'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

const TYPE_LABEL: Record<FeedItem['type'], string> = {
  announcement: 'Announcement',
  pulse: 'Pulse',
  attendance: 'Attendance',
  invoice: 'Billing',
  grade: 'Grade',
  missing: 'Missing work',
}

export function ParentFeed({ items }: { items: FeedItem[] }) {
  if (!items.length) {
    return (
      <EmptyState
        title="Family feed is quiet"
        description="Grades, pulse, attendance, and announcements appear here."
      />
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[13px] font-medium text-foreground">Family feed</h2>
        <Badge variant="muted">{items.length}</Badge>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Type</TH>
            <TH>When</TH>
            <TH>Update</TH>
            <TH className="text-right" />
          </TR>
        </THead>
        <TBody>
          {items.map((item) => (
            <TR key={item.id}>
              <TD>
                <Badge variant="muted" className="text-[10px]">
                  {TYPE_LABEL[item.type]}
                </Badge>
              </TD>
              <TD className="whitespace-nowrap text-[12px] text-muted-foreground">
                {safeFormat(item.at)}
              </TD>
              <TD className="min-w-[12rem]">
                <Link href={item.href} className="block hover:text-primary">
                  <span className="font-medium text-foreground">{item.title}</span>
                  {item.body ? (
                    <span className="mt-0.5 block line-clamp-1 text-[12px] text-muted-foreground">
                      {item.body}
                    </span>
                  ) : null}
                </Link>
              </TD>
              <TD className="text-right">
                <Link href={item.href} className="text-[12px] font-medium text-primary hover:underline">
                  Open
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
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

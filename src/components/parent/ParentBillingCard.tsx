import Link from 'next/link'
import { formatMoney } from '@/lib/billing/store'
import { Badge } from '@/components/ui/badge'
import { buttonClassName } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export type ParentInvoiceRow = {
  id: string
  description: string
  familyName: string
  amountCents: number
  currency: string
  status: string
  dueDate: string | null
  payUrl: string | null
  createdAt: string
}

export function ParentBillingCard({ invoices }: { invoices: ParentInvoiceRow[] }) {
  const open = invoices.filter((i) => i.status === 'open' || i.status === 'overdue')
  const paid = invoices.filter((i) => i.status === 'paid').slice(0, 5)
  const openTotal = open.reduce((s, i) => s + i.amountCents, 0)

  if (invoices.length === 0) {
    return (
      <EmptyState
        title="No invoices yet"
        description="When the office bills your family, balances and pay links will show here."
      />
    )
  }

  return (
    <div className="space-y-4">
      {open.length > 0 ? (
        <Card className="border-warning/25 bg-warning-soft/40">
          <CardContent className="pt-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-warning">
              Balance due
            </p>
            <p className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
              {formatMoney(openTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              {open.length} open invoice{open.length === 1 ? '' : 's'}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <ul className="space-y-2">
        {open.map((inv) => (
          <li key={inv.id}>
            <Card>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 pt-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{inv.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatMoney(inv.amountCents, inv.currency)}
                    {inv.dueDate ? ` · due ${inv.dueDate}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={inv.status === 'overdue' ? 'danger' : 'warning'}>
                    {inv.status}
                  </Badge>
                  {inv.payUrl ? (
                    <Link href={inv.payUrl} className={buttonClassName('primary', 'sm')}>
                      Pay now
                    </Link>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      {paid.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Recently paid
          </p>
          <ul className="space-y-1.5">
            {paid.map((inv) => (
              <li
                key={inv.id}
                className="flex justify-between gap-2 rounded-xl border border-border/70 bg-muted/30 px-3 py-2 text-sm"
              >
                <span className="truncate text-muted-foreground">{inv.description}</span>
                <span className="font-medium tabular-nums text-foreground">
                  {formatMoney(inv.amountCents, inv.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

import Link from 'next/link'
import { formatMoney } from '@/lib/billing/store'
import { Badge } from '@/components/ui/badge'

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
      <div className="rounded-2xl border bg-card p-5 text-sm text-muted-foreground">
        No tuition or aftercare invoices for your email yet. When the office bills your family, pay
        links will show here.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {open.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-sky-50 px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-800">
            Balance due
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-navy">
            {formatMoney(openTotal)}
          </p>
          <p className="text-xs text-muted-foreground">
            {open.length} open invoice{open.length === 1 ? '' : 's'}
          </p>
        </div>
      )}

      <ul className="space-y-2">
        {open.map((inv) => (
          <li
            key={inv.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card px-4 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium truncate">{inv.description}</p>
              <p className="text-xs text-muted-foreground">
                {formatMoney(inv.amountCents, inv.currency)}
                {inv.dueDate ? ` · due ${inv.dueDate}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge variant={inv.status === 'overdue' ? 'danger' : 'sky'}>{inv.status}</Badge>
              {inv.payUrl ? (
                <Link
                  href={inv.payUrl}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-500"
                >
                  Pay now
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {paid.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Recently paid</p>
          <ul className="space-y-1.5">
            {paid.map((inv) => (
              <li
                key={inv.id}
                className="flex justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2 text-sm"
              >
                <span className="truncate text-muted-foreground">{inv.description}</span>
                <span className="font-medium tabular-nums text-emerald-900">
                  {formatMoney(inv.amountCents, inv.currency)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

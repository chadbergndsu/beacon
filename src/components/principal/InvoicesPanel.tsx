'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTuitionInvoice, recordPayment } from '@/app/actions/billing'
import type { BillingInvoice, BillingPayment, BillingProduct } from '@/lib/billing/types'
import { formatMoney } from '@/lib/billing/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export function InvoicesPanel({
  products,
  invoices,
  payments,
  qbConnected,
}: {
  products: BillingProduct[]
  invoices: BillingInvoice[]
  payments: BillingPayment[]
  qbConnected: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      {qbConnected && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          QuickBooks connected — new invoices/payments push when sync prefs allow; use Payments → Push to QuickBooks for backlog.
        </div>
      )}

      <Card>
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold">Create tuition invoice</h3>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              setError(null)
              setOk(null)
              start(async () => {
                const res = await createTuitionInvoice({
                  familyName: String(fd.get('familyName') || ''),
                  parentEmail: String(fd.get('parentEmail') || ''),
                  productId: String(fd.get('productId') || ''),
                  dueDate: String(fd.get('dueDate') || ''),
                })
                if (!res.ok) setError(res.error)
                else {
                  setOk('Invoice created.')
                  e.currentTarget.reset()
                  router.refresh()
                }
              })
            }}
          >
            <label className="text-xs font-medium text-muted-foreground">
              Family name
              <input
                name="familyName"
                required
                placeholder="Johnson family"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Parent email
              <input
                name="parentEmail"
                type="email"
                placeholder="parent@example.com"
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Product
              <select name="productId" required className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatMoney(p.amountCents)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Due date
              <input name="dueDate" type="date" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </label>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            {ok && <p className="text-sm text-emerald-700 sm:col-span-2">{ok}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending || !products.length}>
                Create invoice
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h3 className="font-semibold mb-3">Invoices</h3>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <ul className="space-y-2">
              {invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{inv.familyName}</p>
                    <p className="text-xs text-muted-foreground">
                      {inv.description}
                      {inv.parentEmail ? ` · ${inv.parentEmail}` : ''}
                      {inv.dueDate ? ` · due ${inv.dueDate}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold tabular-nums">{formatMoney(inv.amountCents)}</span>
                    <Badge
                      variant={
                        inv.status === 'paid'
                          ? 'success'
                          : inv.status === 'overdue'
                            ? 'danger'
                            : 'sky'
                      }
                    >
                      {inv.status}
                    </Badge>
                    {inv.status === 'open' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() =>
                          start(async () => {
                            await recordPayment({ invoiceId: inv.id, method: 'card' })
                            router.refresh()
                          })
                        }
                      >
                        Record payment
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5">
          <h3 className="font-semibold mb-3">Payments</h3>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <ul className="space-y-2">
              {payments.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap justify-between gap-2 rounded-xl border px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium tabular-nums">{formatMoney(p.amountCents)}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.method}
                      {p.paidAt ? ` · ${new Date(p.paidAt).toLocaleString()}` : ''}
                      {p.qbPaymentId ? ` · QB ${p.qbPaymentId}` : ''}
                    </p>
                  </div>
                  <Badge variant={p.status === 'succeeded' ? 'success' : 'muted'}>{p.status}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

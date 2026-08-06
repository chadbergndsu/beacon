'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTuitionInvoice, recordPayment } from '@/app/actions/billing'
import {
  createFamilyPaymentPlan,
  createRecurringSchedule,
  emailInvoiceToFamily,
  remindOpenInvoices,
  runRecurringBillingNow,
} from '@/app/actions/family-billing'
import type {
  BillingInvoice,
  BillingPayment,
  BillingPaymentPlan,
  BillingProduct,
  BillingSchedule,
} from '@/lib/billing/types'
import { formatMoney } from '@/lib/billing/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

export function InvoicesPanel({
  products,
  invoices,
  payments,
  plans = [],
  schedules = [],
  qbConnected,
  stripeConfigured,
}: {
  products: BillingProduct[]
  invoices: BillingInvoice[]
  payments: BillingPayment[]
  plans?: BillingPaymentPlan[]
  schedules?: BillingSchedule[]
  qbConnected: boolean
  stripeConfigured?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
        <p className="font-semibold">Family billing (school-owned)</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Portal pay links, reminders, payment plans, and recurring tuition — built into Beacon.
          Not BillerGenie or any third-party biller lock-in.
          {stripeConfigured
            ? ' Stripe Checkout is on for online card pay.'
            : ' Set STRIPE_SECRET_KEY for online card pay; office can still record cash/check.'}
          {qbConnected ? ' QuickBooks push available for accounting.' : ''}
        </p>
      </div>

      <FieldError>{error}</FieldError>
      {ok ? (
        <p className="rounded-xl border border-success/25 bg-success-soft px-3.5 py-2.5 text-sm text-success">
          {ok}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null)
              setOk(null)
              const r = await remindOpenInvoices()
              if (!r.ok) setError(r.error)
              else
                setOk(
                  `Reminders: ${r.sent} sent` +
                    (r.errors.length ? ` · ${r.errors.length} issues` : '')
                )
              router.refresh()
            })
          }
        >
          Email reminders (open invoices)
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError(null)
              setOk(null)
              const r = await runRecurringBillingNow()
              if (!r.ok) setError(r.error)
              else
                setOk(
                  `Recurring run: ${r.created} invoice(s)` +
                    (r.errors.length ? ` · ${r.errors.join('; ')}` : '')
                )
              router.refresh()
            })
          }
        >
          Run due recurring bills
        </Button>
      </div>

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
                  setOk('Invoice created with family pay link.')
                  e.currentTarget.reset()
                  router.refresh()
                }
              })
            }}
          >
            <Field>
              <Label htmlFor="inv-familyName">Family name</Label>
              <Input
                id="inv-familyName"
                name="familyName"
                required
                placeholder="Johnson family"
              />
            </Field>
            <Field>
              <Label htmlFor="inv-parentEmail">Parent email</Label>
              <Input
                id="inv-parentEmail"
                name="parentEmail"
                type="email"
                placeholder="parent@example.com"
              />
            </Field>
            <Field>
              <Label htmlFor="inv-productId">Product</Label>
              <Select id="inv-productId" name="productId" required>
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {formatMoney(p.amountCents)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="inv-dueDate">Due date</Label>
              <Input id="inv-dueDate" name="dueDate" type="date" />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                Create invoice
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold">Payment plan (split balance)</h3>
          <p className="text-xs text-muted-foreground">
            Creates 2–24 open installment invoices with monthly due dates — family portal links on
            each.
          </p>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              setError(null)
              setOk(null)
              start(async () => {
                const res = await createFamilyPaymentPlan({
                  familyName: String(fd.get('familyName') || ''),
                  parentEmail: String(fd.get('parentEmail') || ''),
                  description: String(fd.get('description') || ''),
                  totalDollars: Number(fd.get('totalDollars') || 0),
                  installmentCount: Number(fd.get('installmentCount') || 0),
                  firstDueDate: String(fd.get('firstDueDate') || ''),
                })
                if (!res.ok) setError(res.error)
                else {
                  setOk('Payment plan created.')
                  e.currentTarget.reset()
                  router.refresh()
                }
              })
            }}
          >
            <Field>
              <Label htmlFor="plan-familyName">Family name</Label>
              <Input id="plan-familyName" name="familyName" required />
            </Field>
            <Field>
              <Label htmlFor="plan-parentEmail">Parent email</Label>
              <Input id="plan-parentEmail" name="parentEmail" type="email" required />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="plan-description">Description</Label>
              <Input
                id="plan-description"
                name="description"
                placeholder="Annual tuition plan"
              />
            </Field>
            <Field>
              <Label htmlFor="plan-totalDollars">Total ($)</Label>
              <Input
                id="plan-totalDollars"
                name="totalDollars"
                type="number"
                step="0.01"
                min="1"
                required
              />
            </Field>
            <Field>
              <Label htmlFor="plan-installmentCount"># installments</Label>
              <Input
                id="plan-installmentCount"
                name="installmentCount"
                type="number"
                min={2}
                max={24}
                defaultValue={4}
                required
              />
            </Field>
            <Field>
              <Label htmlFor="plan-firstDueDate">First due date</Label>
              <Input id="plan-firstDueDate" name="firstDueDate" type="date" required />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending} variant="outline">
                Create payment plan
              </Button>
            </div>
          </form>
          {plans.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1 border-t pt-2">
              {plans.slice(0, 5).map((p) => (
                <li key={p.id}>
                  {p.familyName} · {p.installmentCount}× · {formatMoney(p.totalCents)} · {p.status}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold">Recurring schedule (auto-invoice)</h3>
          <p className="text-xs text-muted-foreground">
            Monthly / term / annual product billing. Run due bills above or from Go-live ops.
          </p>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              setError(null)
              setOk(null)
              start(async () => {
                const res = await createRecurringSchedule({
                  familyName: String(fd.get('familyName') || ''),
                  parentEmail: String(fd.get('parentEmail') || ''),
                  productId: String(fd.get('productId') || ''),
                  nextRunOn: String(fd.get('nextRunOn') || ''),
                })
                if (!res.ok) setError(res.error)
                else {
                  setOk('Recurring schedule saved.')
                  e.currentTarget.reset()
                  router.refresh()
                }
              })
            }}
          >
            <Field>
              <Label htmlFor="sched-familyName">Family name</Label>
              <Input id="sched-familyName" name="familyName" required />
            </Field>
            <Field>
              <Label htmlFor="sched-parentEmail">Parent email</Label>
              <Input id="sched-parentEmail" name="parentEmail" type="email" required />
            </Field>
            <Field>
              <Label htmlFor="sched-productId">Product</Label>
              <Select id="sched-productId" name="productId" required>
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.frequency})
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label htmlFor="sched-nextRunOn">Next bill date</Label>
              <Input id="sched-nextRunOn" name="nextRunOn" type="date" required />
            </Field>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending} variant="outline">
                Add schedule
              </Button>
            </div>
          </form>
          {schedules.length > 0 && (
            <ul className="text-xs text-muted-foreground space-y-1 border-t pt-2">
              {schedules.slice(0, 8).map((s) => (
                <li key={s.id}>
                  {s.familyName} · {s.description} · next {s.nextRunOn}
                  {!s.active ? ' (paused)' : ''}
                </li>
              ))}
            </ul>
          )}
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
                      {inv.installmentIndex ? ` · #${inv.installmentIndex}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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
                    {(inv.status === 'open' || inv.status === 'overdue') && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              setError(null)
                              setOk(null)
                              const r = await emailInvoiceToFamily(inv.id)
                              if (!r.ok) setError(r.error)
                              else setOk(`Emailed portal link.`)
                              router.refresh()
                            })
                          }
                        >
                          Email pay link
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() =>
                            start(async () => {
                              await recordPayment({ invoiceId: inv.id, method: 'cash' })
                              router.refresh()
                            })
                          }
                        >
                          Record office pay
                        </Button>
                      </>
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
                      {p.notes ? ` · ${p.notes.slice(0, 40)}` : ''}
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

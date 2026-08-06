'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBillingProduct } from '@/app/actions/billing'
import type { BillingFrequency, BillingProduct } from '@/lib/billing/types'
import { formatMoney } from '@/lib/billing/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'

export function BillingProductsForm({ products }: { products: BillingProduct[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5">
          <h3 className="mb-3 font-semibold tracking-tight">Tuition & fee products</h3>
          {products.length === 0 ? (
            <EmptyState title="No products yet" description="Add tuition or fee products below." />
          ) : (
            <ul className="divide-y divide-border/70 rounded-xl border border-border/80">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatMoney(p.amountCents)}</p>
                    <Badge variant="default" className="mt-1">
                      {p.frequency.replace('_', ' ')}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <h3 className="font-semibold tracking-tight">Add product</h3>
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault()
              const fd = new FormData(e.currentTarget)
              setError(null)
              setOk(null)
              start(async () => {
                const res = await createBillingProduct({
                  name: String(fd.get('name') || ''),
                  description: String(fd.get('description') || ''),
                  amountDollars: Number(fd.get('amount') || 0),
                  frequency: String(fd.get('frequency') || 'monthly') as BillingFrequency,
                })
                if (!res.ok) setError(res.error)
                else {
                  setOk('Product added.')
                  e.currentTarget.reset()
                  router.refresh()
                }
              })
            }}
          >
            <Field className="sm:col-span-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" name="name" required />
            </Field>
            <Field className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" />
            </Field>
            <Field>
              <Label htmlFor="amount">Amount (USD)</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min={0}
                step={0.01}
                required
                defaultValue={450}
              />
            </Field>
            <Field>
              <Label htmlFor="frequency">Frequency</Label>
              <Select id="frequency" name="frequency" defaultValue="monthly">
                <option value="monthly">Monthly</option>
                <option value="term">Per term</option>
                <option value="annual">Annual</option>
                <option value="one_time">One-time</option>
              </Select>
            </Field>
            <div className="sm:col-span-2">
              <FieldError>{error}</FieldError>
              {ok ? <p className="text-sm font-medium text-success">{ok}</p> : null}
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? 'Saving…' : 'Add product'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

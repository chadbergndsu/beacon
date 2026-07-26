'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createBillingProduct } from '@/app/actions/billing'
import type { BillingFrequency, BillingProduct } from '@/lib/billing/types'
import { formatMoney } from '@/lib/billing/store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export function BillingProductsForm({ products }: { products: BillingProduct[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-5">
          <h3 className="font-semibold mb-3">Tuition & fee products</h3>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products yet.</p>
          ) : (
            <ul className="divide-y rounded-xl border">
              {products.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{p.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums">{formatMoney(p.amountCents)}</p>
                    <Badge variant="sky" className="mt-1">
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
        <CardContent className="pt-5 space-y-3">
          <h3 className="font-semibold">Add product</h3>
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
            <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
              Name
              <input name="name" required className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-muted-foreground sm:col-span-2">
              Description
              <input name="description" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Amount (USD)
              <input
                name="amount"
                type="number"
                min={0}
                step={0.01}
                required
                defaultValue={450}
                className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              Frequency
              <select name="frequency" className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">
                <option value="monthly">Monthly</option>
                <option value="term">Per term</option>
                <option value="annual">Annual</option>
                <option value="one_time">One-time</option>
              </select>
            </label>
            {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
            {ok && <p className="text-sm text-emerald-700 sm:col-span-2">{ok}</p>}
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

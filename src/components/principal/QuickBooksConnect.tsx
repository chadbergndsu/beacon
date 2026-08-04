'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, CheckCircle2, Link2, RefreshCw, Unplug } from 'lucide-react'
import {
  disconnectQuickBooks,
  saveSyncPreferences,
  simulateQuickBooksSync,
  startQuickBooksConnect,
} from '@/app/actions/billing'
import type { QuickBooksConnection } from '@/lib/billing/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function QuickBooksConnect({
  connection,
  qbConfigured,
  flash,
}: {
  connection: QuickBooksConnection
  qbConfigured: boolean
  flash?: { connected?: boolean; error?: string; demo?: string }
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<string | null>(flash?.demo || null)
  const [error, setError] = useState<string | null>(flash?.error || null)
  const [syncCustomers, setSyncCustomers] = useState(connection.syncCustomers)
  const [syncInvoices, setSyncInvoices] = useState(connection.syncInvoices)
  const [syncPayments, setSyncPayments] = useState(connection.syncPayments)

  return (
    <div className="space-y-4">
      {flash?.connected && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          QuickBooks connected successfully.
        </div>
      )}
      {message && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-[#2CA01C] to-[#1a7a12] px-5 py-4 text-white flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">QuickBooks Online</p>
              <p className="text-xs text-white/85">Intuit · Accounting sync for Beacon tuition</p>
            </div>
          </div>
          <Badge
            variant={
              connection.status === 'connected' || connection.status === 'demo'
                ? 'success'
                : 'outline'
            }
            className={
              connection.status === 'connected' || connection.status === 'demo'
                ? 'bg-white text-emerald-800 border-0'
                : 'bg-white/10 text-white border-white/30'
            }
          >
            {connection.status}
          </Badge>
        </div>

        <CardContent className="pt-5 space-y-5">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Company</p>
              <p className="mt-1 font-medium">
                {connection.companyName || 'Not connected'}
              </p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Environment</p>
              <p className="mt-1 font-medium capitalize">{connection.environment}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Realm ID</p>
              <p className="mt-1 font-mono text-xs">{connection.realmId || '—'}</p>
            </div>
          </div>

          {!qbConfigured && (
            <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/50 p-4 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground mb-1">Live OAuth setup</p>
              <p>
                Add these to Vercel / <code className="text-xs bg-muted px-1 rounded">.env.local</code> to
                connect a real QuickBooks company:
              </p>
              <ul className="mt-2 font-mono text-xs space-y-1">
                <li>INTUIT_CLIENT_ID</li>
                <li>INTUIT_CLIENT_SECRET</li>
                <li>INTUIT_REDIRECT_URI=…/api/quickbooks/callback</li>
                <li>INTUIT_ENVIRONMENT=sandbox</li>
              </ul>
              <p className="mt-2">
                Create an app at{' '}
                <a
                  href="https://developer.intuit.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-700 font-medium underline"
                >
                  developer.intuit.com
                </a>
                . Until then, <strong>Connect</strong> activates a sandbox demo company so you can
                tour the full principal payment layer.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-semibold text-navy dark:text-sky-50">What to sync</p>
            {[
              {
                key: 'customers',
                label: 'Customers / families',
                checked: syncCustomers,
                set: setSyncCustomers,
              },
              {
                key: 'invoices',
                label: 'Tuition invoices',
                checked: syncInvoices,
                set: setSyncInvoices,
              },
              {
                key: 'payments',
                label: 'Payments received',
                checked: syncPayments,
                set: setSyncPayments,
              },
            ].map((row) => (
              <label
                key={row.key}
                className="flex items-center gap-2 text-sm rounded-lg border px-3 py-2 bg-card"
              >
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={row.checked}
                  onChange={(e) => row.set(e.target.checked)}
                />
                {row.label}
              </label>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await saveSyncPreferences({
                    syncCustomers,
                    syncInvoices,
                    syncPayments,
                  })
                  setMessage('Sync preferences saved.')
                  router.refresh()
                })
              }
            >
              Save sync preferences
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {connection.status !== 'connected' ? (
              <Button
                size="lg"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    setError(null)
                    setMessage(null)
                    const res = await startQuickBooksConnect()
                    if (res.ok) {
                      window.location.href = res.url
                      return
                    }
                    if (res.demo) {
                      setMessage(res.error)
                      router.refresh()
                      return
                    }
                    setError(res.error)
                  })
                }
              >
                <Link2 className="h-4 w-4" />
                {pending ? 'Connecting…' : 'Connect QuickBooks'}
              </Button>
            ) : (
              <>
                <Button
                  size="lg"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      const res = await simulateQuickBooksSync()
                      if (!res.ok) setError(res.error)
                      else setMessage(res.message)
                      router.refresh()
                    })
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync now
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  disabled={pending}
                  onClick={() =>
                    start(async () => {
                      await disconnectQuickBooks()
                      setMessage('QuickBooks disconnected.')
                      router.refresh()
                    })
                  }
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </Button>
              </>
            )}
          </div>

          {connection.status === 'connected' && (
            <div className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Invoices and payments created in Beacon will queue for QuickBooks. Live API posting
                uses your Intuit app tokens after OAuth.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

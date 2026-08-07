'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Cookie, Loader2 } from 'lucide-react'
import { parentCreateLbcTopUp } from '@/app/actions/snack'
import { LBC_TOP_UP_PRESETS_CENTS, LBC_LABEL } from '@/lib/snack/ledger'
import { formatMoney } from '@/lib/billing/store'
import type { SnackAccount } from '@/lib/snack/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'

export function ParentLbcCard({ accounts }: { accounts: SnackAccount[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [studentId, setStudentId] = useState(accounts[0]?.studentId ?? '')
  const [amountCents, setAmountCents] = useState<number>(LBC_TOP_UP_PRESETS_CENTS[1] ?? 1000)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  if (!accounts.length) {
    return (
      <EmptyState
        title={`${LBC_LABEL}`}
        description="When your children are linked, you can load snack funds here for the LBC."
      />
    )
  }

  const selected = accounts.find((a) => a.studentId === studentId) ?? accounts[0]!

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Cookie className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                {LBC_LABEL}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Kids buy snacks at school — load funds here. Balance stays with your child.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <ul className="space-y-2">
        {accounts.map((a) => (
          <li key={a.id}>
            <Card>
              <CardContent className="flex items-center justify-between gap-3 pt-4">
                <div>
                  <p className="font-medium">{a.studentName}</p>
                  <p className="text-xs text-muted-foreground">Snack balance</p>
                </div>
                <Badge variant={a.balanceCents > 0 ? 'success' : 'muted'} className="tabular-nums">
                  {formatMoney(a.balanceCents, a.currency)}
                </Badge>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <p className="text-sm font-semibold tracking-tight">Load funds</p>
          <label className="block text-xs font-medium text-muted-foreground">
            Child
            <select
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={selected.studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              {accounts.map((a) => (
                <option key={a.studentId} value={a.studentId}>
                  {a.studentName} · {formatMoney(a.balanceCents)}
                </option>
              ))}
            </select>
          </label>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Amount</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {LBC_TOP_UP_PRESETS_CENTS.map((cents) => (
                <button
                  key={cents}
                  type="button"
                  onClick={() => setAmountCents(cents)}
                  className={
                    amountCents === cents
                      ? 'rounded-lg border border-primary bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground'
                      : 'rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-muted'
                  }
                >
                  {formatMoney(cents)}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="button"
            disabled={pending}
            onClick={() => {
              setMsg(null)
              setErr(null)
              start(async () => {
                const r = await parentCreateLbcTopUp({
                  studentId: selected.studentId,
                  amountCents,
                })
                if (!r.ok) {
                  setErr(r.error)
                  return
                }
                if (r.payPath) {
                  router.push(r.payPath)
                  return
                }
                setMsg(r.note || 'Top-up created.')
              })
            }}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {pending ? 'Creating pay link…' : `Load ${formatMoney(amountCents)} → Pay`}
          </Button>
          {msg ? <p className="text-xs text-emerald-700">{msg}</p> : null}
          {err ? <p className="text-xs text-red-600">{err}</p> : null}
        </CardContent>
      </Card>
    </div>
  )
}

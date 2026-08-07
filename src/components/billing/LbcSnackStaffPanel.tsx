'use client'

import { useMemo, useState, useTransition } from 'react'
import { Cookie, Loader2 } from 'lucide-react'
import {
  staffRecordLbcCashTopUp,
  staffRecordLbcPurchase,
  staffEnsureLbcAccount,
} from '@/app/actions/snack'
import { LBC_LABEL } from '@/lib/snack/ledger'
import { formatMoney } from '@/lib/billing/store'
import type { SnackAccount } from '@/lib/snack/store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export type LbcStudentOption = {
  id: string
  name: string
}

export function LbcSnackStaffPanel({
  accounts: initialAccounts,
  students,
}: {
  accounts: SnackAccount[]
  students: LbcStudentOption[]
}) {
  const [accounts, setAccounts] = useState(initialAccounts)
  const [pending, start] = useTransition()
  const [studentId, setStudentId] = useState(students[0]?.id ?? '')
  const [amountDollars, setAmountDollars] = useState('2.50')
  const [note, setNote] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.studentId === studentId),
    [accounts, studentId]
  )

  function dollarsToCents(raw: string): number | null {
    const n = Number(raw.replace(/[^0-9.]/g, ''))
    if (!Number.isFinite(n) || n <= 0) return null
    return Math.round(n * 100)
  }

  function run(
    fn: () => Promise<{ ok: true; balanceCents?: number; note?: string } | { ok: false; error: string }>
  ) {
    setMsg(null)
    setErr(null)
    start(async () => {
      const r = await fn()
      if (!r.ok) {
        setErr(r.error)
        return
      }
      setMsg(r.note || 'Saved.')
      if (typeof r.balanceCents === 'number') {
        setAccounts((prev) => {
          const hit = prev.find((a) => a.studentId === studentId)
          if (hit) {
            return prev.map((a) =>
              a.studentId === studentId ? { ...a, balanceCents: r.balanceCents! } : a
            )
          }
          return prev
        })
      }
    })
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Cookie className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {LBC_LABEL}
            </p>
            <h2 className="text-lg font-semibold tracking-tight">Snack Shack register</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Debit purchases when kids buy food. Parents load funds from their dashboard; office can
              also cash-load.
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="lbc-student">Student</Label>
            <select
              id="lbc-student"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {selectedAccount ? (
              <p className="mt-1 text-xs text-muted-foreground">
                Balance{' '}
                <Badge variant="muted" className="ml-1 tabular-nums">
                  {formatMoney(selectedAccount.balanceCents)}
                </Badge>
              </p>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">No wallet yet — open one below.</p>
            )}
          </div>
          <div>
            <Label htmlFor="lbc-amount">Amount (USD)</Label>
            <Input
              id="lbc-amount"
              value={amountDollars}
              onChange={(e) => setAmountDollars(e.target.value)}
              inputMode="decimal"
              placeholder="2.50"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="lbc-note">Note (optional)</Label>
          <Input
            id="lbc-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Chips, juice, pretzel…"
            className="mt-1"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            disabled={pending || !studentId}
            onClick={() => {
              const cents = dollarsToCents(amountDollars)
              if (cents == null) {
                setErr('Enter a valid amount.')
                return
              }
              run(() =>
                staffRecordLbcPurchase({
                  studentId,
                  amountCents: cents,
                  note: note || undefined,
                })
              )
            }}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Charge purchase
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !studentId}
            onClick={() => {
              const cents = dollarsToCents(amountDollars)
              if (cents == null) {
                setErr('Enter a valid amount.')
                return
              }
              run(() =>
                staffRecordLbcCashTopUp({
                  studentId,
                  amountCents: cents,
                  note: note || undefined,
                })
              )
            }}
          >
            Cash / office load
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={pending || !studentId}
            onClick={() => {
              setMsg(null)
              setErr(null)
              start(async () => {
                const r = await staffEnsureLbcAccount(studentId)
                if (!r.ok) {
                  setErr(r.error)
                  return
                }
                setMsg(`Wallet ready · ${formatMoney(r.balanceCents ?? 0)}`)
                const name = students.find((s) => s.id === studentId)?.name || 'Student'
                setAccounts((prev) => {
                  if (prev.some((a) => a.studentId === studentId)) {
                    return prev.map((a) =>
                      a.studentId === studentId
                        ? { ...a, balanceCents: r.balanceCents ?? a.balanceCents }
                        : a
                    )
                  }
                  return [
                    {
                      id: `tmp-${studentId}`,
                      schoolId: '',
                      studentId,
                      studentName: name,
                      balanceCents: r.balanceCents ?? 0,
                      currency: 'USD',
                      label: LBC_LABEL,
                    },
                    ...prev,
                  ]
                })
              })
            }}
          >
            Open wallet
          </Button>
        </div>

        {msg ? <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p> : null}
        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        {accounts.length > 0 ? (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Wallets
            </p>
            <ul className="max-h-56 space-y-1 overflow-y-auto text-sm">
              {accounts.map((a) => (
                <li
                  key={a.id}
                  className="flex cursor-pointer justify-between gap-2 rounded-lg border border-border/70 px-3 py-2 hover:bg-muted/40"
                  onClick={() => setStudentId(a.studentId)}
                >
                  <span className="truncate">{a.studentName}</span>
                  <span className="tabular-nums font-medium">{formatMoney(a.balanceCents)}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

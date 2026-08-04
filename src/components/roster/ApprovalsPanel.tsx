'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reviewApprovalAction, restoreRevisionAction } from '@/app/actions/roster'
import type { RosterRevision } from '@/lib/roster/revisions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function ApprovalsPanel({
  requests,
  revisions,
}: {
  requests: {
    id: string
    kind: string
    entityLabel: string
    status: string
    createdAt: string
    requestedByName?: string
  }[]
  revisions: RosterRevision[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const pendingOnly = requests.filter((r) => r.status === 'pending')

  return (
    <div className="space-y-8">
      {msg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {msg}
        </p>
      )}
      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {err}
        </p>
      )}

      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="text-lg font-bold text-navy dark:text-sky-50">
          Pending deletion requests
        </h2>
        <p className="text-xs text-muted-foreground">
          Teachers request student/class removals. Approve to soft-delete (still recoverable from
          history) or reject to keep as-is.
        </p>
        {pendingOnly.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending requests. All clear.</p>
        ) : (
          <ul className="space-y-3">
            {pendingOnly.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50/50 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-amber-950">{r.entityLabel}</p>
                  <p className="text-xs text-amber-900/80">
                    {r.kind.replace(/_/g, ' ')}
                    {r.requestedByName ? ` · from ${r.requestedByName}` : ''} ·{' '}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    onClick={() => {
                      setMsg(null)
                      setErr(null)
                      start(async () => {
                        const res = await reviewApprovalAction({
                          requestId: r.id,
                          decision: 'approved',
                        })
                        if (!res.ok) {
                          setErr(res.error)
                          return
                        }
                        setMsg(`Approved: ${r.entityLabel}`)
                        router.refresh()
                      })
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setMsg(null)
                      setErr(null)
                      start(async () => {
                        const res = await reviewApprovalAction({
                          requestId: r.id,
                          decision: 'rejected',
                          note: 'Rejected by principal',
                        })
                        if (!res.ok) {
                          setErr(res.error)
                          return
                        }
                        setMsg(`Rejected: ${r.entityLabel}`)
                        router.refresh()
                      })
                    }}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {requests.filter((r) => r.status !== 'pending').length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Recent decisions</p>
            <ul className="space-y-1 text-sm">
              {requests
                .filter((r) => r.status !== 'pending')
                .slice(0, 10)
                .map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <Badge variant={r.status === 'approved' ? 'success' : 'warning'}>
                      {r.status}
                    </Badge>
                    <span>{r.entityLabel}</span>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <h2 className="text-lg font-bold text-navy dark:text-sky-50">
          School roster history (version control)
        </h2>
        <p className="text-xs text-muted-foreground">
          Undo creates, deletes, enrollments, and teacher assignments. Restore writes a new history
          entry so you can reverse again if needed.
        </p>
        {revisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No revisions yet. Run{' '}
            <code className="rounded bg-muted px-1">scripts/pending-013-roster-versions.sql</code>{' '}
            if tables are missing.
          </p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto text-sm">
            {revisions.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
              >
                <div>
                  <span className="font-medium">{r.action}</span>{' '}
                  <span className="text-muted-foreground">
                    {r.entityType} · {r.actorRole || 'staff'} ·{' '}
                    {new Date(r.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  {r.note && <p className="text-[11px] text-muted-foreground">{r.note}</p>}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => {
                    setMsg(null)
                    setErr(null)
                    start(async () => {
                      const res = await restoreRevisionAction(r.id)
                      if (!res.ok) {
                        setErr(res.error)
                        return
                      }
                      setMsg(res.note)
                      router.refresh()
                    })
                  }}
                >
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

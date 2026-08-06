'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { reviewApprovalAction, restoreRevisionAction } from '@/app/actions/roster'
import type { RosterRevision } from '@/lib/roster/revisions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

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
  const decided = requests.filter((r) => r.status !== 'pending').slice(0, 10)

  return (
    <div className="page-stack">
      {msg ? (
        <p className="rounded-lg border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-lg border border-red-200 bg-danger-soft px-4 py-3 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <section className="space-y-3">
        <div>
          <h2 className="text-[13px] font-medium text-foreground">Pending deletion requests</h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Teachers request student/class removals. Approve to soft-delete (still recoverable from
            history) or reject to keep as-is.
          </p>
        </div>

        {pendingOnly.length === 0 ? (
          <EmptyState title="No pending requests" description="All clear." />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Entity</TH>
                <TH>Kind</TH>
                <TH>Requested</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {pendingOnly.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.entityLabel}</TD>
                  <TD className="text-muted-foreground">
                    {r.kind.replace(/_/g, ' ')}
                    {r.requestedByName ? ` · ${r.requestedByName}` : ''}
                  </TD>
                  <TD className="whitespace-nowrap text-[12px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString()}
                  </TD>
                  <TD className="text-right">
                    <div className="flex justify-end gap-2">
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
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {decided.length > 0 ? (
          <div className="border-t border-border pt-4">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Recent decisions
            </p>
            <Table>
              <THead>
                <TR>
                  <TH>Status</TH>
                  <TH>Entity</TH>
                </TR>
              </THead>
              <TBody>
                {decided.map((r) => (
                  <TR key={r.id}>
                    <TD>
                      <Badge variant={r.status === 'approved' ? 'success' : 'warning'}>
                        {r.status}
                      </Badge>
                    </TD>
                    <TD>{r.entityLabel}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
        ) : null}
      </section>

      <section className="space-y-3 border-t border-border pt-6">
        <div>
          <h2 className="text-[13px] font-medium text-foreground">
            School roster history (version control)
          </h2>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Undo creates, deletes, enrollments, and teacher assignments. Restore writes a new history
            entry so you can reverse again if needed.
          </p>
        </div>

        {revisions.length === 0 ? (
          <EmptyState
            title="No revisions yet"
            description="Run migration 013 if tables are missing."
          />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>When</TH>
                <TH>Note</TH>
                <TH className="text-right" />
              </TR>
            </THead>
            <TBody>
              {revisions.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.action}</TD>
                  <TD className="text-muted-foreground">
                    {r.entityType} · {r.actorRole || 'staff'}
                  </TD>
                  <TD className="whitespace-nowrap text-[12px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </TD>
                  <TD className="max-w-xs truncate text-[12px] text-muted-foreground">
                    {r.note || '—'}
                  </TD>
                  <TD className="text-right">
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
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  )
}

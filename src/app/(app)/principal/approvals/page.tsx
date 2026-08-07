import { requirePrincipal } from '@/lib/principal'
import { createAdminClient } from '@/lib/supabase/admin'
import { listRosterRevisions } from '@/lib/roster/revisions'
import { ApprovalsPanel } from '@/components/roster/ApprovalsPanel'
import { PageHeader } from '@/components/ui/page-header'

export default async function PrincipalApprovalsPage() {
  const { schoolId } = await requirePrincipal()
  const admin = createAdminClient()

  let requests: {
    id: string
    kind: string
    entityLabel: string
    status: string
    createdAt: string
    requestedByName?: string
  }[] = []

  const { data: rows, error: rowsErr } = await admin
    .from('approval_requests')
    .select('id, kind, entity_label, status, created_at, requested_by')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (!rowsErr && rows) {
    const requesterIds = [
      ...new Set(rows.map((r) => r.requested_by as string).filter(Boolean)),
    ]
    const names = new Map<string, string>()
    if (requesterIds.length) {
      const { data: people } = await admin
        .from('profiles')
        .select('id, full_name, email')
        .in('id', requesterIds)
      for (const p of people ?? []) {
        names.set(p.id as string, (p.full_name as string) || (p.email as string) || 'Staff')
      }
    }
    requests = rows.map((r) => ({
      id: String(r.id),
      kind: String(r.kind),
      entityLabel: String(r.entity_label || ''),
      status: String(r.status),
      createdAt: String(r.created_at),
      requestedByName: names.get(r.requested_by as string),
    }))
  }

  const revisions = await listRosterRevisions(admin, schoolId, 60)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Safety net"
        title="Approvals & roster history"
        description="Teachers request student/class removals here. Approve, reject, or restore any roster change from version history if someone made a mistake."
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-950">
        First time: run{' '}
        <code className="rounded bg-white px-1">migration 013</code> (
        <code className="rounded bg-white px-1">npm run db:migrate</code>) in
        Supabase SQL Editor so approvals and history tables exist.
      </div>

      <ApprovalsPanel requests={requests} revisions={revisions} />
    </div>
  )
}

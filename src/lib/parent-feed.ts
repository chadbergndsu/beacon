import { createAdminClient } from '@/lib/supabase/admin'
import { listPulsesForStudent } from '@/lib/school-modules/store'
import { loadAttendanceForStudent } from '@/lib/attendance/store'
import { loadBillingState } from '@/lib/billing/store'
import { ATTENDANCE_LABEL } from '@/lib/attendance/types'
import { PULSE_LEVEL_LABEL } from '@/lib/school-modules/types'
import { formatMoney } from '@/lib/billing/store'
import type { MissingWorkSummary } from '@/lib/insights/missing-work'

export type FeedItem = {
  id: string
  type: 'announcement' | 'pulse' | 'attendance' | 'invoice' | 'grade' | 'missing'
  title: string
  body: string
  href: string
  at: string
  tone?: 'default' | 'warning' | 'success' | 'info'
}

/**
 * Unified parent home feed — grades-adjacent signals in one stream.
 */
export async function buildParentFeed(
  parentId: string,
  schoolId: string,
  children: { id: string; first_name: string; last_name: string }[],
  missingSummaries: MissingWorkSummary[]
): Promise<FeedItem[]> {
  const admin = createAdminClient()
  const items: FeedItem[] = []
  const childIds = children.map((child) => child.id)
  const missingByStudent = new Map(
    missingSummaries.map((summary) => [summary.studentId, summary])
  )

  // Announcements
  const { data: announcements } = await admin
    .from('announcements')
    .select('id, title, body, published_at, audience')
    .eq('school_id', schoolId)
    .in('audience', ['parents', 'all'])
    .order('published_at', { ascending: false })
    .limit(15)

  for (const a of announcements ?? []) {
    items.push({
      id: `ann_${a.id}`,
      type: 'announcement',
      title: a.title,
      body: (a.body || '').slice(0, 160),
      href: `/announcements/${a.id}`,
      at: a.published_at || new Date().toISOString(),
      tone: 'info',
    })
  }

  const { data: gradeData } = childIds.length
    ? await admin
        .from('grades')
        .select('id, score, is_missing, entered_at, assignment_id, student_id')
        .in('student_id', childIds)
        .order('entered_at', { ascending: false })
        .limit(Math.max(8, childIds.length * 8))
    : { data: [] }
  const allGradeRows = gradeData ?? []
  const assignmentIds = [
    ...new Set(
      allGradeRows
        .map((grade) => grade.assignment_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ]
  const { data: assignmentRows } = assignmentIds.length
    ? await admin
        .from('assignments')
        .select('id, title, class_id, classes!inner(school_id)')
        .in('id', assignmentIds)
        .eq('classes.school_id', schoolId)
    : { data: [] }
  const assignmentById = new Map(
    (assignmentRows ?? []).map((assignment) => [assignment.id, assignment])
  )

  for (const child of children) {
    const name = `${child.first_name} ${child.last_name}`

    // Missing work radar signal (market: parents open apps for this first)
    const missing = missingByStudent.get(child.id)
    if (missing && missing.missingCount > 0) {
      const sample = missing.missing
        .slice(0, 3)
        .map((m) => m.title)
        .join(', ')
      items.push({
        id: `missing_${child.id}`,
        type: 'missing',
        title: `Missing work · ${name}`,
        body: `${missing.missingCount} item(s): ${sample}${
          missing.missingCount > 3 ? '…' : ''
        }`,
        href: `/students/${child.id}`,
        at: new Date().toISOString(),
        tone: 'warning',
      })
    }

    // Pulses
    const pulses = await listPulsesForStudent(schoolId, child.id)
    for (const p of pulses.slice(0, 8)) {
      items.push({
        id: `pulse_${p.id}`,
        type: 'pulse',
        title: `Beacon Pulse · ${name}`,
        body: [
          PULSE_LEVEL_LABEL[p.overall],
          p.celebrate ? `Celebrate: ${p.celebrate}` : null,
          p.note ? p.note.slice(0, 100) : null,
        ]
          .filter(Boolean)
          .join(' · '),
        href: `/students/${child.id}`,
        at: p.createdAt,
        tone: p.overall === 'needs_care' ? 'warning' : p.overall === 'strong' ? 'success' : 'default',
      })
    }

    // Attendance
    const att = await loadAttendanceForStudent(child.id, 14)
    for (const a of att) {
      if (a.status === 'present') continue
      items.push({
        id: `att_${a.id}`,
        type: 'attendance',
        title: `Attendance · ${name}`,
        body: `${ATTENDANCE_LABEL[a.status]} on ${a.date}${a.note ? ` — ${a.note}` : ''}`,
        href: `/students/${child.id}`,
        at: `${a.date}T12:00:00.000Z`,
        tone: a.status === 'absent' ? 'warning' : 'info',
      })
    }

    // Recent grades (sample last entered)
    const childGradeRows = allGradeRows
      .filter((grade) => grade.student_id === child.id)
      .slice(0, 8)
    for (const g of childGradeRows) {
      let assignmentTitle = 'Assignment'
      let classId: string | null = null
      if (g.assignment_id) {
        const asg = assignmentById.get(g.assignment_id)
        if (asg) {
          assignmentTitle = asg.title
          classId = asg.class_id
        }
      }
      items.push({
        id: `grade_${g.id}`,
        type: 'grade',
        title: `Grade update · ${name}`,
        body: g.is_missing
          ? `${assignmentTitle}: Missing`
          : `${assignmentTitle}: ${g.score ?? '—'}`,
        href: classId
          ? `/classes/${classId}/students/${child.id}`
          : `/students/${child.id}`,
        at: g.entered_at || new Date().toISOString(),
        tone: g.is_missing ? 'warning' : 'default',
      })
    }
  }

  // Invoices (match parent profile email → pay portal when open)
  try {
    const billing = await loadBillingState(schoolId)
    const { data: parent } = await admin
      .from('profiles')
      .select('email')
      .eq('id', parentId)
      .maybeSingle()
    const email = parent?.email?.toLowerCase()
    const { familyPayUrl } = await import('@/lib/billing/portal-token')
    const { ensureInvoicePortalToken } = await import('@/lib/billing/store')
    for (const inv of billing.invoices.slice(0, 10)) {
      if (email && inv.parentEmail?.toLowerCase() === email) {
        let href = '/dashboard#billing'
        if (inv.status === 'open' || inv.status === 'overdue') {
          try {
            const token =
              inv.portalToken || (await ensureInvoicePortalToken(schoolId, inv.id))
            href = familyPayUrl(token)
          } catch {
            /* keep dashboard */
          }
        }
        items.push({
          id: `inv_${inv.id}`,
          type: 'invoice',
          title: `Invoice · ${inv.familyName}`,
          body: `${inv.description} — ${formatMoney(inv.amountCents)} (${inv.status})`,
          href,
          at: inv.createdAt,
          tone: inv.status === 'open' || inv.status === 'overdue' ? 'warning' : 'success',
        })
      }
    }
  } catch {
    /* billing optional */
  }

  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40)
}

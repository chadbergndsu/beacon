import Link from 'next/link'
import { Activity } from 'lucide-react'
import { requirePrincipal } from '@/lib/principal'
import { createAdminClient } from '@/lib/supabase/admin'
import { listAllPulses } from '@/lib/school-modules/store'
import { PULSE_LEVEL_LABEL, type PulseLevel } from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

function badge(level: PulseLevel): 'success' | 'default' | 'warning' {
  if (level === 'strong') return 'success'
  if (level === 'steady') return 'default'
  return 'warning'
}

export default async function PrincipalPulsePage() {
  const { schoolId } = await requirePrincipal()
  const admin = createAdminClient()
  const pulses = await listAllPulses(schoolId)

  const { data: students } = await admin
    .from('students')
    .select('id, first_name, last_name')
    .eq('school_id', schoolId)
  const studentMap = new Map(
    (students ?? []).map((s) => [s.id, `${s.last_name}, ${s.first_name}`])
  )

  const counts = { strong: 0, steady: 0, needs_care: 0 }
  for (const p of pulses.slice(0, 100)) {
    counts[p.overall]++
  }

  return (
    <div className="page-stack animate-beacon-in">
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            School climate
          </span>
        }
        title="Beacon Pulse board"
        description="Whole-child signals across your school — not a grade spreadsheet. See who is thriving and who needs pastoral or academic care this week."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['strong', 'Strong'],
            ['steady', 'Steady'],
            ['needs_care', 'Needs care'],
          ] as const
        ).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="pt-4 pb-4">
              <p className="text-[11px] font-medium uppercase text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{counts[key]}</p>
              <p className="text-[11px] text-muted-foreground">recent signals</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pulses.length === 0 ? (
        <EmptyState
          title="No pulses yet"
          description="Teachers log them from a class → Beacon Pulse tab."
        />
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Student</TH>
              <TH>Date</TH>
              <TH>Teacher</TH>
              <TH>Overall</TH>
              <TH>Notes</TH>
              <TH className="text-right" />
            </TR>
          </THead>
          <TBody>
            {pulses.slice(0, 40).map((p) => (
              <TR key={p.id}>
                <TD className="font-medium">
                  {studentMap.get(p.studentId) || 'Student'}
                </TD>
                <TD className="whitespace-nowrap text-muted-foreground">{p.date}</TD>
                <TD>{p.teacherName}</TD>
                <TD>
                  <Badge variant={badge(p.overall)}>{PULSE_LEVEL_LABEL[p.overall]}</Badge>
                </TD>
                <TD className="min-w-[10rem] max-w-md">
                  {p.celebrate ? (
                    <p className="text-[12px] font-medium text-success">{p.celebrate}</p>
                  ) : null}
                  {p.note ? (
                    <p className="text-[12px] text-muted-foreground line-clamp-2">{p.note}</p>
                  ) : (
                    '—'
                  )}
                </TD>
                <TD className="text-right">
                  <Link
                    href={`/students/${p.studentId}`}
                    className="text-[12px] font-medium text-primary hover:underline"
                  >
                    Open
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </div>
  )
}

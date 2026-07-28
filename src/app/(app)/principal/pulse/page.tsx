import Link from 'next/link'
import { Activity } from 'lucide-react'
import { requirePrincipal } from '@/lib/principal'
import { createAdminClient } from '@/lib/supabase/admin'
import { listAllPulses } from '@/lib/school-modules/store'
import { PULSE_LEVEL_LABEL, type PulseLevel } from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

function badge(level: PulseLevel): 'success' | 'sky' | 'warning' {
  if (level === 'strong') return 'success'
  if (level === 'steady') return 'sky'
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
    <div className="space-y-6 animate-beacon-in">
      <div>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-violet-600" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-violet-700">
            School climate
          </p>
        </div>
        <h2 className="mt-1 text-xl font-bold text-navy dark:text-sky-50">Beacon Pulse board</h2>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Whole-child signals across LCA — not a grade spreadsheet. See who is thriving and who
          needs pastoral or academic care this week.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(
          [
            ['strong', 'Strong'],
            ['steady', 'Steady'],
            ['needs_care', 'Needs care'],
          ] as const
        ).map(([key, label]) => (
          <Card key={key}>
            <CardContent className="pt-5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">{label}</p>
              <p className="text-3xl font-bold tabular-nums mt-1">{counts[key]}</p>
              <p className="text-xs text-muted-foreground">recent signals</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {pulses.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No pulses yet. Teachers log them from a class → <strong>Beacon Pulse</strong> tab.
        </Card>
      ) : (
        <ul className="space-y-2">
          {pulses.slice(0, 40).map((p) => (
            <li key={p.id}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold">
                      {studentMap.get(p.studentId) || 'Student'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {p.date} · {p.teacherName}
                      {p.celebrate ? ` · 🎉 ${p.celebrate}` : ''}
                    </p>
                    {p.note && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{p.note}</p>
                    )}
                    <Link
                      href={`/students/${p.studentId}`}
                      className="text-xs font-medium text-sky-700 hover:underline mt-1 inline-block"
                    >
                      Open student →
                    </Link>
                  </div>
                  <Badge variant={badge(p.overall)}>{PULSE_LEVEL_LABEL[p.overall]}</Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

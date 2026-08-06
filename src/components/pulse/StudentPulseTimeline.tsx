import { Activity } from 'lucide-react'
import {
  PULSE_LABELS,
  PULSE_LEVEL_LABEL,
  type PulseEntry,
  type PulseLevel,
} from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

function badge(level: PulseLevel): 'success' | 'sky' | 'warning' {
  if (level === 'strong') return 'success'
  if (level === 'steady') return 'sky'
  return 'warning'
}

export function StudentPulseTimeline({
  pulses,
  studentName,
}: {
  pulses: PulseEntry[]
  studentName: string
}) {
  if (!pulses.length) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          No Beacon Pulse entries yet for {studentName}. Teachers log whole-child check-ins here —
          beyond grades alone.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3 animate-beacon-in">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Beacon Pulse · whole-child signals
        </h3>
      </div>
      <ul className="space-y-2">
        {pulses.map((p) => (
          <li key={p.id}>
            <Card>
              <CardContent className="space-y-2 pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    {p.date} · {p.teacherName}
                  </p>
                  <Badge variant={badge(p.overall)}>{PULSE_LEVEL_LABEL[p.overall]}</Badge>
                </div>
                {p.celebrate ? (
                  <p className="text-sm font-medium text-success">{p.celebrate}</p>
                ) : null}
                {p.note && profileSafeNote(p.note) && (
                  <p className="text-sm text-foreground/90">{p.note}</p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {Object.entries(p.dimensions).map(([k, v]) =>
                    v ? (
                      <Badge key={k} variant="muted" className="font-normal">
                        {PULSE_LABELS[k as keyof typeof PULSE_LABELS]}: {PULSE_LEVEL_LABEL[v]}
                      </Badge>
                    ) : null
                  )}
                </div>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Parents see celebrate + general note; keep simple for now (same note field). */
function profileSafeNote(note: string) {
  return note.trim().length > 0
}

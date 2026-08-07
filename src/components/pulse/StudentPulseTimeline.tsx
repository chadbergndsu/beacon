import {
  PULSE_LABELS,
  PULSE_LEVEL_LABEL,
  type PulseEntry,
  type PulseLevel,
} from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

function badge(level: PulseLevel): 'success' | 'default' | 'warning' {
  if (level === 'strong') return 'success'
  if (level === 'steady') return 'default'
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
      <EmptyState
        title="No pulse entries yet"
        description={`Teachers log whole-child check-ins for ${studentName}.`}
      />
    )
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Date</TH>
          <TH>Teacher</TH>
          <TH>Overall</TH>
          <TH>Notes</TH>
        </TR>
      </THead>
      <TBody>
        {pulses.map((p) => (
          <TR key={p.id}>
            <TD className="whitespace-nowrap text-[12px] text-muted-foreground">{p.date}</TD>
            <TD className="text-[12px]">{p.teacherName}</TD>
            <TD>
              <Badge variant={badge(p.overall)}>{PULSE_LEVEL_LABEL[p.overall]}</Badge>
            </TD>
            <TD className="min-w-[12rem]">
              {p.celebrate ? (
                <p className="text-[12px] font-medium text-success">{p.celebrate}</p>
              ) : null}
              {p.note ? (
                <p className="text-[12px] text-foreground">{p.note}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap gap-1">
                {Object.entries(p.dimensions).map(([k, v]) =>
                  v ? (
                    <Badge key={k} variant="muted" className="text-[10px] font-normal">
                      {PULSE_LABELS[k as keyof typeof PULSE_LABELS]}: {PULSE_LEVEL_LABEL[v]}
                    </Badge>
                  ) : null
                )}
              </div>
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}

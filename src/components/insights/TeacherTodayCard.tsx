import Link from 'next/link'
import type { ClassMissingRollup } from '@/lib/insights/missing-work'
import { Badge } from '@/components/ui/badge'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

/**
 * Teacher "Today" — class pressure at a glance.
 */
export function TeacherTodayCard({
  rollups,
  totalMissingStudents,
  totalMissingItems,
}: {
  rollups: ClassMissingRollup[]
  totalMissingStudents: number
  totalMissingItems: number
}) {
  if (!rollups.length) return null

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-foreground">Today&apos;s focus</p>
        <div className="flex gap-1.5">
          <Badge variant={totalMissingItems > 0 ? 'warning' : 'success'}>
            {totalMissingItems} open
          </Badge>
          <Badge variant="muted">{totalMissingStudents} students</Badge>
        </div>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Class</TH>
            <TH className="text-right">Enrolled</TH>
            <TH className="text-right">Missing</TH>
            <TH>Top students</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {rollups.map((r) => (
            <TR key={r.classId}>
              <TD>
                <Link
                  href={`/classes/${r.classId}`}
                  className="font-medium text-foreground hover:text-primary hover:underline"
                >
                  {r.className}
                </Link>
              </TD>
              <TD className="text-right tabular-nums text-muted-foreground">{r.studentCount}</TD>
              <TD className="text-right tabular-nums">
                {r.studentsWithMissing > 0 ? (
                  <span className="font-medium text-warning">{r.studentsWithMissing}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TD>
              <TD>
                {r.topStudents.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {r.topStudents.map((s) => (
                      <Link
                        key={s.studentId}
                        href={`/students/${s.studentId}`}
                        className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-foreground hover:bg-muted"
                      >
                        {s.studentName}
                        <span className="ml-0.5 tabular-nums text-muted-foreground">×{s.count}</span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <span className="text-[12px] text-muted-foreground">Clear</span>
                )}
              </TD>
              <TD className="text-right">
                <div className="inline-flex gap-2 text-[12px]">
                  <Link href="/teacher/quick" className="text-muted-foreground hover:text-foreground">
                    Quick
                  </Link>
                  <Link
                    href={`/classes/${r.classId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    Gradebook
                  </Link>
                </div>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  )
}

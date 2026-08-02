import Link from 'next/link'
import { Sunrise, Users } from 'lucide-react'
import type { ClassMissingRollup } from '@/lib/insights/missing-work'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

/**
 * Teacher "Today" — Jupiter-style less-clicking, more teaching.
 * Surfaces class pressure without a district analytics wall.
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
    <Card className="overflow-hidden border-sky-200/80 dark:border-sky-900/40">
      <div className="border-b border-border bg-gradient-to-r from-sky-50 to-white px-5 py-4 dark:from-sky-950/40 dark:to-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sunrise className="h-5 w-5 text-sky-600" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700">
                Teacher Today
              </p>
              <h2 className="font-bold text-navy dark:text-sky-50">Where to focus</h2>
            </div>
          </div>
          <div className="flex gap-1.5">
            <Badge variant={totalMissingItems > 0 ? 'warning' : 'success'}>
              {totalMissingItems} open items
            </Badge>
            <Badge variant="sky">{totalMissingStudents} students</Badge>
          </div>
        </div>
      </div>
      <CardContent className="pt-4">
        <ul className="space-y-3">
          {rollups.map((r) => (
            <li
              key={r.classId}
              className="rounded-xl border border-border px-3.5 py-3 hover:border-sky-300/60 transition"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/classes/${r.classId}`}
                    className="font-semibold text-sky-800 hover:underline dark:text-sky-300"
                  >
                    {r.className}
                  </Link>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {r.studentCount} enrolled · {r.studentsWithMissing} with missing work
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/teacher/quick"
                    className="text-xs font-semibold text-emerald-700 hover:underline"
                  >
                    Quick mode
                  </Link>
                  <Link
                    href={`/classes/${r.classId}`}
                    className="text-xs font-semibold text-sky-700 hover:underline"
                  >
                    Gradebook →
                  </Link>
                </div>
              </div>
              {r.topStudents.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {r.topStudents.map((s) => (
                    <li key={s.studentId}>
                      <Link
                        href={`/students/${s.studentId}`}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-900 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800"
                      >
                        {s.studentName}
                        <span className="tabular-nums opacity-70">×{s.count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {r.topStudents.length === 0 && (
                <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">
                  No missing work pressure in this class.
                </p>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

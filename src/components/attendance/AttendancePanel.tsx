'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardCheck } from 'lucide-react'
import { saveAttendance } from '@/app/actions/attendance'
import type { Student } from '@/lib/types'
import type { AttendanceRecord, AttendanceStatus } from '@/lib/attendance/types'
import { ATTENDANCE_LABEL } from '@/lib/attendance/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'tardy', 'excused']

export function AttendancePanel({
  classId,
  students,
  initialDate,
  initialRecords,
}: {
  classId: string
  students: Student[]
  initialDate: string
  initialRecords: AttendanceRecord[]
}) {
  const router = useRouter()
  const [date, setDate] = useState(initialDate)
  const [pending, start] = useTransition()
  const [notify, setNotify] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initialMap = useMemo(() => {
    const m = new Map<string, AttendanceStatus>()
    for (const r of initialRecords) m.set(r.studentId, r.status)
    return m
  }, [initialRecords])

  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttendanceStatus>>(() => {
    const o: Record<string, AttendanceStatus> = {}
    for (const s of students) o[s.id] = initialMap.get(s.id) || 'present'
    return o
  })

  const counts = useMemo(() => {
    const c = { present: 0, absent: 0, tardy: 0, excused: 0 }
    for (const s of students) c[statusByStudent[s.id] || 'present']++
    return c
  }, [students, statusByStudent])

  return (
    <div className="space-y-6 animate-beacon-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Daily habit
          </p>
          <h2 className="text-xl font-bold text-navy dark:text-sky-50 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-sky-600" />
            Attendance
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Mark the roster, save once. Optionally notify parents of absent/tardy.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((s) => (
            <Badge key={s} variant={s === 'absent' ? 'warning' : s === 'present' ? 'success' : 'sky'}>
              {ATTENDANCE_LABEL[s]}: {counts[s]}
            </Badge>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="pt-5 flex flex-wrap items-end gap-4">
          <div>
            <Label htmlFor="att-date">Date</Label>
            <Input
              id="att-date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                // reload page data for new date
                router.push(`/classes/${classId}?tab=attendance&date=${e.target.value}`)
              }}
            />
          </div>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
            />
            Email parents for absent/tardy
          </label>
          <div className="flex flex-wrap gap-2 ml-auto">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={() => {
                const o: Record<string, AttendanceStatus> = {}
                for (const s of students) o[s.id] = 'present'
                setStatusByStudent(o)
              }}
            >
              Mark all present
            </Button>
            <Button
              size="lg"
              disabled={pending || !students.length}
              onClick={() => {
                setError(null)
                setMessage(null)
                start(async () => {
                  const rows = students.map((s) => ({
                    studentId: s.id,
                    status: statusByStudent[s.id] || 'present',
                  }))
                  const res = await saveAttendance(classId, date, rows, {
                    notifyParents: notify,
                  })
                  if (!res.ok) setError(res.error)
                  else {
                    setMessage(
                      res.notifyNote ? `Saved. ${res.notifyNote}` : 'Attendance saved.'
                    )
                    router.refresh()
                  }
                })
              }}
            >
              {pending ? 'Saving…' : 'Save attendance'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card className="overflow-hidden">
        <ul className="divide-y">
          {students.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-sky-50/40 dark:hover:bg-sky-950/20"
            >
              <div>
                <p className="font-semibold text-sm">
                  {s.last_name}, {s.first_name}
                </p>
                {s.grade_level && (
                  <p className="text-xs text-muted-foreground">Gr. {s.grade_level}</p>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() =>
                      setStatusByStudent((prev) => ({ ...prev, [s.id]: st }))
                    }
                    className={cn(
                      'rounded-lg px-2.5 py-1.5 text-xs font-semibold border transition',
                      statusByStudent[s.id] === st
                        ? st === 'present'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : st === 'absent'
                            ? 'bg-amber-600 text-white border-amber-600'
                            : 'bg-sky-600 text-white border-sky-600'
                        : 'bg-card border-border text-muted-foreground hover:border-sky-300'
                    )}
                  >
                    {ATTENDANCE_LABEL[st]}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {!students.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">No students enrolled.</p>
        )}
      </Card>
    </div>
  )
}

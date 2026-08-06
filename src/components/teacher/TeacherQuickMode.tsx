'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Save,
} from 'lucide-react'
import { saveGrades } from '@/app/actions/grades'
import { saveAttendance } from '@/app/actions/attendance'
import { submitPulse } from '@/app/actions/pulse'
import type { Assignment, Grade, Student } from '@/lib/types'
import type { AttendanceRecord, AttendanceStatus } from '@/lib/attendance/types'
import { ATTENDANCE_LABEL } from '@/lib/attendance/types'
import {
  PULSE_LEVEL_LABEL,
  type PulseLevel,
} from '@/lib/school-modules/types'
import { Button, buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FieldError } from '@/components/ui/field'
import { Select } from '@/components/ui/select'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Mode = 'score' | 'attendance' | 'pulse'

type ClassOption = {
  id: string
  name: string
  subject: string | null
  studentCount: number
}

type ClassBundle = {
  students: Student[]
  assignments: Assignment[]
  grades: Grade[]
  attendance: AttendanceRecord[]
  today: string
}

const STATUSES: AttendanceStatus[] = ['present', 'absent', 'tardy', 'excused']
const PULSE_LEVELS: PulseLevel[] = ['strong', 'steady', 'needs_care']
const SCORE_PRESETS = [100, 95, 90, 85, 80, 75]

function statusTone(s: AttendanceStatus, active: boolean) {
  if (!active) return 'border-border bg-muted/40 text-muted-foreground'
  if (s === 'present') return 'border-success bg-success text-white'
  if (s === 'absent') return 'border-warning bg-warning text-white'
  if (s === 'tardy') return 'border-primary bg-primary text-white'
  return 'border-border bg-muted text-foreground'
}

function pulseTone(l: PulseLevel, active: boolean) {
  if (!active) return 'border-border bg-card text-foreground'
  if (l === 'strong') return 'border-success bg-success text-white'
  if (l === 'steady') return 'border-primary bg-primary text-white'
  return 'border-warning bg-warning text-white'
}

export function TeacherQuickMode({
  classes,
  bundles,
  initialClassId,
}: {
  classes: ClassOption[]
  bundles: Record<string, ClassBundle>
  initialClassId: string | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [classId, setClassId] = useState(initialClassId ?? classes[0]?.id ?? '')
  const [mode, setMode] = useState<Mode>('attendance')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const bundle = classId ? bundles[classId] : undefined
  const students = useMemo(() => bundle?.students ?? [], [bundle])
  const assignments = useMemo(() => bundle?.assignments ?? [], [bundle])
  const today = bundle?.today ?? new Date().toISOString().slice(0, 10)

  // —— Score state ——
  const [assignmentId, setAssignmentId] = useState(assignments[0]?.id ?? '')
  const [scoreDraft, setScoreDraft] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {}
    for (const g of bundle?.grades ?? []) {
      if (g.is_missing) o[`${g.student_id}::${g.assignment_id}`] = 'M'
      else if (g.score != null) o[`${g.student_id}::${g.assignment_id}`] = String(g.score)
    }
    return o
  })

  // —— Attendance state ——
  const [statusByStudent, setStatusByStudent] = useState<Record<string, AttendanceStatus>>(() => {
    const o: Record<string, AttendanceStatus> = {}
    const map = new Map((bundle?.attendance ?? []).map((r) => [r.studentId, r.status]))
    for (const s of students) o[s.id] = map.get(s.id) || 'present'
    return o
  })

  // —— Pulse state ——
  const [pulseStudentId, setPulseStudentId] = useState(students[0]?.id ?? '')
  const [pulseOverall, setPulseOverall] = useState<PulseLevel>('steady')
  const [pulseNote, setPulseNote] = useState('')

  // Re-sync local state when class changes
  const switchClass = (id: string) => {
    setClassId(id)
    setMessage(null)
    setError(null)
    const b = bundles[id]
    if (!b) return
    setAssignmentId(b.assignments[0]?.id ?? '')
    const draft: Record<string, string> = {}
    for (const g of b.grades) {
      if (g.is_missing) draft[`${g.student_id}::${g.assignment_id}`] = 'M'
      else if (g.score != null) draft[`${g.student_id}::${g.assignment_id}`] = String(g.score)
    }
    setScoreDraft(draft)
    const att: Record<string, AttendanceStatus> = {}
    const map = new Map(b.attendance.map((r) => [r.studentId, r.status]))
    for (const s of b.students) att[s.id] = map.get(s.id) || 'present'
    setStatusByStudent(att)
    setPulseStudentId(b.students[0]?.id ?? '')
    setPulseOverall('steady')
    setPulseNote('')
  }

  const activeAssignment = useMemo(
    () => assignments.find((a) => a.id === assignmentId) ?? assignments[0],
    [assignments, assignmentId]
  )

  const attCounts = useMemo(() => {
    const c = { present: 0, absent: 0, tardy: 0, excused: 0 }
    for (const s of students) c[statusByStudent[s.id] || 'present']++
    return c
  }, [students, statusByStudent])

  const setAllPresent = () => {
    const o: Record<string, AttendanceStatus> = {}
    for (const s of students) o[s.id] = 'present'
    setStatusByStudent(o)
  }

  const scoreKey = (studentId: string) =>
    `${studentId}::${activeAssignment?.id ?? ''}`

  const handleSaveScores = () => {
    if (!classId || !activeAssignment) return
    setMessage(null)
    setError(null)
    start(async () => {
      const grades: Grade[] = students.map((s) => {
        const raw = (scoreDraft[scoreKey(s.id)] ?? '').trim()
        const isMissing = raw.toLowerCase() === 'm'
        const num = Number(raw)
        return {
          assignment_id: activeAssignment.id,
          student_id: s.id,
          score: isMissing || raw === '' || !Number.isFinite(num) ? null : num,
          is_missing: isMissing,
        }
      })
      // Only send rows that have a value or were explicitly cleared from previous
      const toSave = grades.filter((g) => {
        const raw = (scoreDraft[`${g.student_id}::${g.assignment_id}`] ?? '').trim()
        return raw !== ''
      })
      if (!toSave.length) {
        setError('Enter at least one score first.')
        return
      }
      const res = await saveGrades(classId, toSave, { notifyParents: false })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMessage(`Saved ${toSave.length} score${toSave.length === 1 ? '' : 's'}.`)
      router.refresh()
    })
  }

  const handleSaveAttendance = () => {
    if (!classId) return
    setMessage(null)
    setError(null)
    start(async () => {
      const rows = students.map((s) => ({
        studentId: s.id,
        status: statusByStudent[s.id] || ('present' as AttendanceStatus),
      }))
      const res = await saveAttendance(classId, today, rows, { notifyParents: false })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMessage(`Attendance saved for ${today}.`)
      router.refresh()
    })
  }

  const handleSavePulse = () => {
    if (!classId || !pulseStudentId) return
    setMessage(null)
    setError(null)
    start(async () => {
      const res = await submitPulse(classId, {
        studentId: pulseStudentId,
        overall: pulseOverall,
        dimensions: {},
        note: pulseNote,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      setMessage('Pulse logged.')
      setPulseNote('')
      router.refresh()
    })
  }

  if (!classes.length) {
    return (
      <EmptyState
        tone="primary"
        title="No classes yet"
        description="Once you have a class roster, Quick Mode is the fastest way to mark attendance and scores on your phone."
        action={
          <Link href="/teacher/classroom" className={buttonClassName('primary', 'sm')}>
            Open classroom
          </Link>
        }
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-2xl page-stack pb-safe">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/80 pb-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-medium tracking-tight">Quick mode</h1>
          <p className="text-[12px] text-muted-foreground">Attendance · scores · pulse</p>
        </div>
        <Link
          href={classId ? `/classes/${classId}` : '/dashboard'}
          className={buttonClassName('outline', 'sm')}
        >
          Full class
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="block">
          <span className="text-[12px] font-medium text-muted-foreground">Class</span>
          <Select
            value={classId}
            onChange={(e) => switchClass(e.target.value)}
            className="mt-1 h-10 text-[13px] font-medium"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.subject ? ` · ${c.subject}` : ''} ({c.studentCount})
              </option>
            ))}
          </Select>
        </label>
        <div className="grid grid-cols-3 gap-1.5">
        {(
          [
            { id: 'attendance' as const, label: 'Attend', icon: ClipboardCheck },
            { id: 'score' as const, label: 'Scores', icon: GraduationCap },
            { id: 'pulse' as const, label: 'Pulse', icon: Activity },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setMode(t.id)
              setMessage(null)
              setError(null)
            }}
            className={cn(
              'flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-[12px] font-medium transition',
              mode === t.id
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-foreground'
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
        </div>
      </div>

      {error ? <FieldError>{error}</FieldError> : null}
      {message ? (
        <p className="rounded-lg border border-success/25 bg-success-soft px-3 py-2 text-[13px] text-success">
          {message}
        </p>
      ) : null}

      {/* —— ATTENDANCE —— */}
      {mode === 'attendance' && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {today} · {students.length} students
            </p>
            <button
              type="button"
              onClick={setAllPresent}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-primary"
            >
              All present
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            {STATUSES.map((s) => (
              <span
                key={s}
                className="rounded-full bg-muted px-2.5 py-1 text-muted-foreground"
              >
                {ATTENDANCE_LABEL[s]} {attCounts[s]}
              </span>
            ))}
          </div>

          <Table>
              <THead>
                <TR>
                  <TH>Student</TH>
                  <TH className="text-center">P</TH>
                  <TH className="text-center">A</TH>
                  <TH className="text-center">T</TH>
                  <TH className="text-center">E</TH>
                </TR>
              </THead>
              <TBody>
                {students.map((s) => {
                  const status = statusByStudent[s.id] || 'present'
                  return (
                    <TR key={s.id}>
                      <TD className="font-medium">
                        {s.last_name}, {s.first_name}
                      </TD>
                      {STATUSES.map((st) => (
                        <TD key={st} className="text-center">
                          <button
                            type="button"
                            onClick={() =>
                              setStatusByStudent((prev) => ({ ...prev, [s.id]: st }))
                            }
                            className={cn(
                              'inline-flex h-8 w-8 items-center justify-center rounded-md border text-[11px] font-bold',
                              statusTone(st, status === st)
                            )}
                          >
                            {st === 'present'
                              ? 'P'
                              : st === 'absent'
                                ? 'A'
                                : st === 'tardy'
                                  ? 'T'
                                  : 'E'}
                          </button>
                        </TD>
                      ))}
                    </TR>
                  )
                })}
              </TBody>
            </Table>

          <Button
            size="md"
            className="sticky bottom-3 w-full"
            disabled={pending || !students.length}
            onClick={handleSaveAttendance}
          >
            <Save className="h-4 w-4" />
            {pending ? 'Saving…' : 'Save attendance'}
          </Button>
        </div>
      )}

      {/* —— SCORES —— */}
      {mode === 'score' && (
        <div className="space-y-3">
          {!assignments.length ? (
            <EmptyState
              title="No assignments yet"
              description="Add categories and assignments under Setup."
              action={
                <Link
                  href={`/classes/${classId}?tab=setup`}
                  className={buttonClassName('primary', 'sm')}
                >
                  Open setup
                </Link>
              }
            />
          ) : (
            <>
              <div>
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Assignment
                </p>
                <div className="mobile-scroll-x pb-1">
                  {assignments.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setAssignmentId(a.id)}
                      className={cn(
                        'shrink-0 rounded-md border px-2.5 py-1.5 text-left text-[12px] font-medium transition',
                        (activeAssignment?.id ?? assignmentId) === a.id
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-card'
                      )}
                    >
                      <span className="block max-w-[10rem] truncate">{a.title}</span>
                      <span className="block text-[10px] font-medium opacity-80">
                        {a.max_points} pts
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {activeAssignment && (
                <Table>
                  <THead>
                    <TR>
                      <TH>Student</TH>
                      <TH className="text-center">Score</TH>
                      <TH>Presets</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {students.map((s) => {
                      const key = scoreKey(s.id)
                      const val = scoreDraft[key] ?? ''
                      return (
                        <TR key={s.id}>
                          <TD className="font-medium">
                            {s.last_name}, {s.first_name}
                          </TD>
                          <TD className="text-center">
                            <input
                              inputMode="decimal"
                              value={val}
                              onChange={(e) =>
                                setScoreDraft((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              placeholder="—"
                              aria-label={`Score for ${s.last_name}`}
                              className={cn(
                                'h-9 w-16 rounded-md border border-border bg-background text-center text-[13px] font-semibold tabular-nums',
                                'focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-ring/60',
                                val.toLowerCase() === 'm' && 'border-warning bg-warning-soft text-warning'
                              )}
                            />
                          </TD>
                          <TD>
                            <div className="flex flex-wrap gap-1">
                              {SCORE_PRESETS.map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  onClick={() =>
                                    setScoreDraft((prev) => ({ ...prev, [key]: String(n) }))
                                  }
                                  className={cn(
                                    'min-w-[2.25rem] rounded-md border px-1.5 py-1 text-[11px] font-semibold',
                                    val === String(n)
                                      ? 'border-primary bg-primary text-primary-foreground'
                                      : 'border-border bg-muted/40'
                                  )}
                                >
                                  {n}
                                </button>
                              ))}
                              <button
                                type="button"
                                onClick={() =>
                                  setScoreDraft((prev) => ({ ...prev, [key]: 'M' }))
                                }
                                className={cn(
                                  'min-w-[2.25rem] rounded-md border px-1.5 py-1 text-[11px] font-semibold',
                                  val.toLowerCase() === 'm'
                                    ? 'border-warning bg-warning text-white'
                                    : 'border-border bg-muted/40 text-warning'
                                )}
                              >
                                M
                              </button>
                            </div>
                          </TD>
                        </TR>
                      )
                    })}
                  </TBody>
                </Table>
              )}

              <Button
                size="md"
                className="sticky bottom-3 w-full"
                disabled={pending || !students.length || !activeAssignment}
                onClick={handleSaveScores}
              >
                <Save className="h-4 w-4" />
                {pending ? 'Saving…' : 'Save scores'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* —— PULSE —— */}
      {mode === 'pulse' && (
        <div className="space-y-3">
          {!students.length ? (
            <EmptyState title="No students in this class" />
          ) : (
            <>
              <div className="rounded-lg border border-border bg-card p-3">
                <label className="block">
                  <span className="text-[12px] font-medium text-muted-foreground">Student</span>
                  <Select
                    value={pulseStudentId}
                    onChange={(e) => setPulseStudentId(e.target.value)}
                    className="mt-1 h-10"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.last_name}, {s.first_name}
                      </option>
                    ))}
                  </Select>
                </label>

                <p className="mt-3 text-[12px] font-medium text-muted-foreground">Overall pulse</p>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {PULSE_LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setPulseOverall(l)}
                      className={cn(
                        'rounded-md border px-2 py-2 text-[11px] font-semibold transition',
                        pulseTone(l, pulseOverall === l)
                      )}
                    >
                      {PULSE_LEVEL_LABEL[l]}
                    </button>
                  ))}
                </div>

                <label className="mt-3 block">
                  <span className="text-[12px] font-medium text-muted-foreground">Note</span>
                  <textarea
                    value={pulseNote}
                    onChange={(e) => setPulseNote(e.target.value)}
                    rows={2}
                    placeholder="Optional"
                    className="mt-1 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-ring/60"
                  />
                </label>
              </div>

              <Button
                size="md"
                className="w-full"
                disabled={pending || !pulseStudentId}
                onClick={handleSavePulse}
              >
                <Activity className="h-4 w-4" />
                {pending ? 'Saving…' : 'Log pulse'}
              </Button>
            </>
          )}
        </div>
      )}

      <p className="flex items-center justify-center gap-1 pb-2 text-center text-xs text-muted-foreground">
        Need the full gradebook?
        <Link
          href={classId ? `/classes/${classId}` : '/dashboard'}
          className="inline-flex items-center font-semibold text-primary"
        >
          Open class <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  )
}

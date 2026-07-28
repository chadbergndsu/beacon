'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Activity,
  Check,
  ChevronRight,
  ClipboardCheck,
  GraduationCap,
  Save,
  Zap,
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
import { Button } from '@/components/ui/button'
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

function statusTone(s: AttendanceStatus) {
  if (s === 'present') return 'bg-emerald-500 text-white border-emerald-500'
  if (s === 'absent') return 'bg-amber-500 text-white border-amber-500'
  if (s === 'tardy') return 'bg-sky-500 text-white border-sky-500'
  return 'bg-slate-600 text-white border-slate-600'
}

function pulseTone(l: PulseLevel, active: boolean) {
  if (!active) return 'border-border bg-card text-foreground'
  if (l === 'strong') return 'border-emerald-500 bg-emerald-500 text-white'
  if (l === 'steady') return 'border-sky-500 bg-sky-500 text-white'
  return 'border-amber-500 bg-amber-500 text-white'
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
  const students = bundle?.students ?? []
  const assignments = bundle?.assignments ?? []
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
      <div className="rounded-2xl border bg-card p-8 text-center">
        <Zap className="mx-auto h-8 w-8 text-sky-500" />
        <h1 className="mt-3 text-xl font-bold">No classes yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Once you have a class roster, Quick Mode is the fastest way to mark attendance and scores
          on your phone.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm font-semibold text-sky-700">
          ← Back home
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 pb-safe">
      {/* Header */}
      <div className="rounded-2xl border border-sky-100/80 bg-gradient-to-br from-navy via-slate-900 to-sky-900 px-4 py-4 text-white shadow-[var(--shadow-lift)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300">
              <Zap className="h-3.5 w-3.5" />
              Teacher quick mode
            </p>
            <h1 className="mt-1 text-xl font-bold tracking-tight">Phone-first class tools</h1>
            <p className="mt-1 text-sm text-slate-300">
              Big buttons. One hand. Attendance · scores · pulse.
            </p>
          </div>
          <Link
            href={classId ? `/classes/${classId}` : '/dashboard'}
            className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold"
          >
            Full class
          </Link>
        </div>

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-sky-300/90">
            Class
          </span>
          <select
            value={classId}
            onChange={(e) => switchClass(e.target.value)}
            className="mt-1.5 flex h-12 w-full rounded-xl border border-white/15 bg-white/10 px-3 text-base font-semibold text-white outline-none focus:ring-2 focus:ring-sky-400"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id} className="text-slate-900">
                {c.name}
                {c.subject ? ` · ${c.subject}` : ''} ({c.studentCount})
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Mode tabs */}
      <div className="grid grid-cols-3 gap-2">
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
              'flex flex-col items-center gap-1 rounded-2xl border px-2 py-3 text-sm font-semibold transition',
              mode === t.id
                ? t.id === 'pulse'
                  ? 'border-violet-500 bg-violet-600 text-white shadow-md'
                  : 'border-sky-500 bg-sky-600 text-white shadow-md'
                : 'border-border bg-card text-foreground'
            )}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </button>
        ))}
      </div>

      {(message || error) && (
        <div
          className={cn(
            'rounded-xl border px-3 py-2.5 text-sm font-medium',
            error
              ? 'border-red-200 bg-red-50 text-red-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-900'
          )}
          role="status"
        >
          {error || message}
        </div>
      )}

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
              className="rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-sky-700"
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

          <ul className="space-y-3">
            {students.map((s) => {
              const status = statusByStudent[s.id] || 'present'
              return (
                <li
                  key={s.id}
                  className="rounded-2xl border border-border/80 bg-card p-3 shadow-[var(--shadow-soft)]"
                >
                  <p className="mb-2 font-semibold text-navy dark:text-sky-50">
                    {s.last_name}, {s.first_name}
                  </p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {STATUSES.map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() =>
                          setStatusByStudent((prev) => ({ ...prev, [s.id]: st }))
                        }
                        className={cn(
                          'rounded-xl border px-1 py-2.5 text-[11px] font-bold transition',
                          status === st
                            ? statusTone(st)
                            : 'border-border bg-muted/40 text-muted-foreground'
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
                    ))}
                  </div>
                </li>
              )
            })}
          </ul>

          <Button
            size="lg"
            className="sticky bottom-3 w-full shadow-lg"
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
            <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
              No assignments yet.{' '}
              <Link href={`/classes/${classId}?tab=setup`} className="font-semibold text-sky-700">
                Add in class setup →
              </Link>
            </div>
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
                        'shrink-0 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition',
                        (activeAssignment?.id ?? assignmentId) === a.id
                          ? 'border-sky-500 bg-sky-600 text-white'
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
                <ul className="space-y-3">
                  {students.map((s) => {
                    const key = scoreKey(s.id)
                    const val = scoreDraft[key] ?? ''
                    return (
                      <li
                        key={s.id}
                        className="rounded-2xl border border-border/80 bg-card p-3 shadow-[var(--shadow-soft)]"
                      >
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="min-w-0 truncate font-semibold text-navy dark:text-sky-50">
                            {s.last_name}, {s.first_name}
                          </p>
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
                              'h-12 w-20 rounded-xl border border-border bg-muted/30 text-center text-lg font-bold tabular-nums',
                              'focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/50',
                              val.toLowerCase() === 'm' && 'bg-amber-50 text-amber-700 border-amber-200'
                            )}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {SCORE_PRESETS.map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() =>
                                setScoreDraft((prev) => ({ ...prev, [key]: String(n) }))
                              }
                              className={cn(
                                'min-w-[2.75rem] rounded-lg border px-2 py-2 text-xs font-bold',
                                val === String(n)
                                  ? 'border-sky-500 bg-sky-500 text-white'
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
                              'min-w-[2.75rem] rounded-lg border px-2 py-2 text-xs font-bold',
                              val.toLowerCase() === 'm'
                                ? 'border-amber-500 bg-amber-500 text-white'
                                : 'border-border bg-muted/40 text-amber-700'
                            )}
                          >
                            M
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setScoreDraft((prev) => ({ ...prev, [key]: '' }))
                            }
                            className="rounded-lg border border-border bg-muted/40 px-2 py-2 text-xs font-medium text-muted-foreground"
                          >
                            Clear
                          </button>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}

              <Button
                size="lg"
                className="sticky bottom-3 w-full shadow-lg"
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
            <div className="rounded-2xl border bg-card p-6 text-center text-sm text-muted-foreground">
              No students in this class.
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-violet-200/70 bg-card p-4 shadow-[var(--shadow-soft)]">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-violet-700">
                  Beacon Pulse · 15 seconds
                </p>
                <label className="mt-3 block">
                  <span className="text-sm font-medium">Student</span>
                  <select
                    value={pulseStudentId}
                    onChange={(e) => setPulseStudentId(e.target.value)}
                    className="mt-1.5 flex h-12 w-full rounded-xl border border-border bg-background px-3 text-base font-medium"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.last_name}, {s.first_name}
                      </option>
                    ))}
                  </select>
                </label>

                <p className="mt-4 text-sm font-medium">Overall pulse</p>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {PULSE_LEVELS.map((l) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setPulseOverall(l)}
                      className={cn(
                        'rounded-xl border px-2 py-3 text-xs font-bold transition',
                        pulseTone(l, pulseOverall === l)
                      )}
                    >
                      {pulseOverall === l && <Check className="mx-auto mb-1 h-3.5 w-3.5" />}
                      {PULSE_LEVEL_LABEL[l]}
                    </button>
                  ))}
                </div>

                <label className="mt-4 block">
                  <span className="text-sm font-medium">Quick note (optional)</span>
                  <textarea
                    value={pulseNote}
                    onChange={(e) => setPulseNote(e.target.value)}
                    rows={2}
                    placeholder="What stood out today…"
                    className="mt-1.5 w-full resize-none rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-400/50"
                  />
                </label>
              </div>

              <Button
                size="lg"
                className="w-full bg-violet-600 shadow-lg hover:from-violet-500 hover:to-violet-600"
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
          className="inline-flex items-center font-semibold text-sky-700"
        >
          Open class <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </p>
    </div>
  )
}

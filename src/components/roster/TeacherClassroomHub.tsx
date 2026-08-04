'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  Check,
  History,
  Loader2,
  ShieldAlert,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  createAbekaClassesAction,
  createClassAction,
  createStudentAction,
  enrollExistingStudentAction,
  importStudentsCsvAction,
  listPendingApprovalsAction,
  requestDeletionAction,
  restoreRevisionAction,
  updateClassCallNumberAction,
} from '@/app/actions/roster'
import {
  ABEKA_GRADES,
  coreSubjectsForGrade,
  suggestCallCode,
  suggestClassName,
  subjectsForGrade,
  type AbekaSubject,
} from '@/lib/curriculum/abeka'
import { STUDENT_CSV_TEMPLATE } from '@/lib/roster/csv'
import type { RosterRevision } from '@/lib/roster/revisions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export type TeacherClass = {
  id: string
  name: string
  subject: string | null
  grade_level: string | null
  call_number: string | null
  enrollment_count: number
}

export type TeacherStudent = {
  id: string
  first_name: string
  last_name: string
  grade_level: string | null
  class_ids: string[]
}

export function TeacherClassroomHub({
  teacherName,
  classes,
  students,
  revisions,
  pendingRequests,
}: {
  teacherName: string
  classes: TeacherClass[]
  students: TeacherStudent[]
  revisions: RosterRevision[]
  pendingRequests: {
    id: string
    kind: string
    entityLabel: string
    status: string
    createdAt: string
  }[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Abeka class builder
  const [gradeId, setGradeId] = useState('5')
  const availableSubjects = useMemo(() => subjectsForGrade(gradeId), [gradeId])
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() =>
    coreSubjectsForGrade('5').map((s) => s.id)
  )
  const [customName, setCustomName] = useState('')
  const [customSubject, setCustomSubject] = useState('')
  const [customCall, setCustomCall] = useState('')
  const [editCallId, setEditCallId] = useState<string | null>(null)
  const [editCallVal, setEditCallVal] = useState('')

  // Student
  const [sf, setSf] = useState('')
  const [sl, setSl] = useState('')
  const [sg, setSg] = useState('5')
  const [sClass, setSClass] = useState(classes[0]?.id ?? '')
  const [csv, setCsv] = useState('')
  const [enStudent, setEnStudent] = useState(students[0]?.id ?? '')
  const [enClass, setEnClass] = useState(classes[0]?.id ?? '')

  function run(
    fn: () => Promise<{ ok: true; [k: string]: unknown } | { ok: false; error: string }>,
    okMsg: string
  ) {
    setMsg(null)
    setErr(null)
    start(async () => {
      const r = await fn()
      if (!r.ok) {
        setErr(r.error)
        return
      }
      setMsg(okMsg)
      router.refresh()
    })
  }

  function toggleSubject(id: string) {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function pickCore() {
    setSelectedSubjects(coreSubjectsForGrade(gradeId).map((s) => s.id))
  }

  // Keep subject selection sensible when grade changes
  function onGradeChange(id: string) {
    setGradeId(id)
    setSg(id)
    const core = coreSubjectsForGrade(id).map((s) => s.id)
    setSelectedSubjects(core)
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-sky-50 to-white p-5 dark:border-emerald-900 dark:from-emerald-950/40 dark:via-sky-950/30 dark:to-slate-950">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
          Your classroom · teacher ownership
        </p>
        <h2 className="mt-1 text-xl font-bold text-navy dark:text-sky-50">
          {teacherName ? `Hi ${teacherName.split(' ')[0]}` : 'My classroom'}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Build your Abeka classes, add students, and run the year. Deleting a student or class
          goes to the principal for approval. Mistakes? Use <strong>History</strong> below to undo
          your own changes. Grade weights and gradebook links also live under{' '}
          <Link href="/teacher/settings" className="font-semibold text-sky-800 underline">
            Settings
          </Link>
          .
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <Badge variant="sky">{classes.length} classes</Badge>
          <Badge variant="success">{students.length} students</Badge>
          {pendingRequests.filter((r) => r.status === 'pending').length > 0 && (
            <Badge variant="warning">
              {pendingRequests.filter((r) => r.status === 'pending').length} pending approval
            </Badge>
          )}
        </div>
      </div>

      {msg && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {msg}
        </p>
      )}
      {err && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {err}
        </p>
      )}

      {/* Abeka classes */}
      <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] space-y-4">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-violet-600" />
          <h3 className="text-lg font-bold text-navy dark:text-sky-50">
            1. Create Abeka classes (you teach them)
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Pick a grade, choose subjects, create in one click. You become the teacher automatically.
        </p>

        <div>
          <Label className="text-xs">Grade</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ABEKA_GRADES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => onGradeChange(g.id)}
                aria-pressed={gradeId === g.id}
                className={cn(
                  'rounded-full border-2 px-3 py-1.5 text-xs font-bold transition shadow-sm',
                  gradeId === g.id
                    ? 'border-violet-700 bg-violet-700 text-white ring-2 ring-violet-300 ring-offset-2'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-violet-400 dark:bg-slate-900 dark:text-slate-100'
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label className="text-xs">
              Subjects for this grade{' '}
              <span className="font-normal text-muted-foreground">
                ({selectedSubjects.length} selected — dark purple = on)
              </span>
            </Label>
            <div className="flex gap-1">
              <Button type="button" size="sm" variant="ghost" onClick={pickCore}>
                Abeka core slate
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setSelectedSubjects([])}
              >
                Clear
              </Button>
            </div>
          </div>
          {selectedSubjects.length > 0 && (
            <p className="mt-2 rounded-lg border-2 border-violet-600 bg-violet-700 px-3 py-2 text-xs font-bold text-white">
              Selected ({selectedSubjects.length}):{' '}
              {selectedSubjects
                .map((id) => availableSubjects.find((s) => s.id === id)?.short || id)
                .join(' · ')}
            </p>
          )}
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {availableSubjects.map((s: AbekaSubject) => {
              const on = selectedSubjects.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSubject(s.id)}
                  aria-pressed={on}
                  className={cn(
                    'relative rounded-xl border-2 px-3 py-2.5 text-left text-sm transition',
                    on
                      ? 'border-violet-700 bg-violet-700 text-white shadow-md shadow-violet-500/30 ring-2 ring-violet-300 ring-offset-1'
                      : 'border-slate-300 bg-white text-slate-900 hover:border-violet-400 hover:bg-violet-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100'
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-bold leading-tight">{s.label}</span>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[10px]',
                        on
                          ? 'border-white bg-white text-violet-700'
                          : 'border-slate-400 bg-transparent text-transparent'
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  </span>
                  <span
                    className={cn(
                      'mt-1 block text-[11px] font-medium',
                      on ? 'text-violet-100' : 'text-muted-foreground'
                    )}
                  >
                    {suggestClassName(gradeId, s)} · call {suggestCallCode(gradeId, s)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <Button
          type="button"
          disabled={pending || selectedSubjects.length === 0}
          className="bg-violet-700 hover:bg-violet-800"
          onClick={() =>
            run(
              () =>
                createAbekaClassesAction({
                  gradeId,
                  subjectIds: selectedSubjects,
                }),
              'Abeka classes created — you are the teacher.'
            )
          }
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create {selectedSubjects.length} class
          {selectedSubjects.length === 1 ? '' : 'es'} for me
        </Button>

        <div className="border-t pt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">Or custom class name</Label>
            <Input
              className="mt-1"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="5th Grade Math Lab"
            />
          </div>
          <div>
            <Label className="text-xs">Subject label</Label>
            <Input
              className="mt-1"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="Arithmetic"
            />
          </div>
          <div>
            <Label className="text-xs">Call # (optional)</Label>
            <Input
              className="mt-1 font-mono"
              value={customCall}
              onChange={(e) => setCustomCall(e.target.value)}
              placeholder="SCI-301 or Abeka code"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || !customName.trim()}
              onClick={() =>
                run(
                  () =>
                    createClassAction({
                      name: customName,
                      subject: customSubject || undefined,
                      gradeLevel: gradeId,
                      callNumber: customCall || null,
                    }),
                  'Class created for you.'
                )
              }
            >
              Add custom class
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Call numbers are optional — many schools attach a section/Abeka-style code for lookup.
          Confirm the exact format with Chris if you need official Abeka product numbers.
        </p>

        {classes.length > 0 && (
          <ul className="space-y-2 border-t pt-4">
            {classes.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-2 border-slate-200 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <Link
                    href={`/classes/${c.id}`}
                    className="font-semibold text-sky-800 hover:underline dark:text-sky-300"
                  >
                    {c.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {[c.subject, c.grade_level].filter(Boolean).join(' · ')} ·{' '}
                    {c.enrollment_count} students
                    {c.call_number ? (
                      <span className="ml-1 font-mono font-bold text-violet-800 dark:text-violet-300">
                        · #{c.call_number}
                      </span>
                    ) : null}
                  </p>
                  {editCallId === c.id ? (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      <Input
                        className="h-8 w-36 font-mono text-xs"
                        value={editCallVal}
                        onChange={(e) => setEditCallVal(e.target.value)}
                        placeholder="Call #"
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={pending}
                        onClick={() =>
                          run(async () => {
                            const r = await updateClassCallNumberAction(
                              c.id,
                              editCallVal || null
                            )
                            if (r.ok) setEditCallId(null)
                            return r
                          }, 'Call number saved.')
                        }
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditCallId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="mt-0.5 text-[11px] font-semibold text-violet-700 underline"
                      onClick={() => {
                        setEditCallId(c.id)
                        setEditCallVal(c.call_number || '')
                      }}
                    >
                      {c.call_number ? 'Edit call #' : 'Add call #'}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/classes/${c.id}`}>
                    <Button type="button" size="sm">
                      Gradebook
                    </Button>
                  </Link>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="text-red-700"
                    disabled={pending}
                    onClick={() =>
                      run(
                        () =>
                          requestDeletionAction({
                            kind: 'delete_class',
                            entityId: c.id,
                            reason: 'Teacher requested archive',
                          }),
                        'Archive request sent to principal (or applied if you have leadership).'
                      )
                    }
                  >
                    Request remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Students */}
      <section className="rounded-2xl border bg-card p-5 shadow-[var(--shadow-soft)] space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-emerald-600" />
          <h3 className="text-lg font-bold text-navy dark:text-sky-50">
            2. Add students to your class
          </h3>
        </div>
        {classes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Create at least one class above first — students enroll into your class.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <div>
                <Label className="text-xs">First name</Label>
                <Input className="mt-1" value={sf} onChange={(e) => setSf(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Last name</Label>
                <Input className="mt-1" value={sl} onChange={(e) => setSl(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Grade</Label>
                <select
                  className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                  value={sg}
                  onChange={(e) => setSg(e.target.value)}
                >
                  {ABEKA_GRADES.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">Into my class</Label>
                <select
                  className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                  value={sClass}
                  onChange={(e) => setSClass(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              type="button"
              disabled={pending || !sf.trim() || !sl.trim() || !sClass}
              onClick={() =>
                run(
                  () =>
                    createStudentAction({
                      firstName: sf,
                      lastName: sl,
                      gradeLevel: sg,
                      classId: sClass,
                    }),
                  'Student added to your class.'
                )
              }
            >
              Add student
            </Button>

            <div className="border-t pt-4">
              <Label className="text-xs">CSV import into a class</Label>
              <textarea
                className="mt-2 w-full min-h-[90px] rounded-xl border px-3 py-2 font-mono text-xs"
                value={csv}
                onChange={(e) => setCsv(e.target.value)}
                placeholder={STUDENT_CSV_TEMPLATE}
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setCsv(STUDENT_CSV_TEMPLATE)}
                >
                  Example CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={pending || !csv.trim() || !sClass}
                  onClick={() =>
                    run(
                      () => importStudentsCsvAction(csv, { defaultClassId: sClass }),
                      'CSV imported into your class.'
                    )
                  }
                >
                  Import to selected class
                </Button>
              </div>
            </div>
          </>
        )}

        {students.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs">
                <tr>
                  <th className="px-3 py-2">Student</th>
                  <th className="px-3 py-2">Grade</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-3 py-1.5">
                      <Link
                        href={`/students/${s.id}`}
                        className="font-medium text-sky-800 hover:underline dark:text-sky-300"
                      >
                        {s.last_name}, {s.first_name}
                      </Link>
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground">
                      {s.grade_level || '—'}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-xs text-red-700"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              requestDeletionAction({
                                kind: 'delete_student',
                                entityId: s.id,
                                reason: 'Teacher requested remove',
                              }),
                            'Delete request sent to principal for approval.'
                          )
                        }
                      >
                        Request delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {classes.length > 0 && students.length > 0 && (
          <div className="flex flex-wrap items-end gap-2 border-t pt-4">
            <div>
              <Label className="text-xs">Enroll existing student</Label>
              <select
                className="mt-1 block rounded-lg border px-2 py-2 text-sm"
                value={enStudent}
                onChange={(e) => setEnStudent(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.last_name}, {s.first_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Into class</Label>
              <select
                className="mt-1 block rounded-lg border px-2 py-2 text-sm"
                value={enClass}
                onChange={(e) => setEnClass(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() =>
                run(
                  () => enrollExistingStudentAction(enClass, enStudent),
                  'Student enrolled.'
                )
              }
            >
              Enroll
            </Button>
          </div>
        )}
      </section>

      {/* Approvals */}
      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-amber-600" />
          <h3 className="text-lg font-bold text-navy dark:text-sky-50">
            3. Your deletion requests
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Removing students or classes needs principal approval so mistakes don&apos;t wipe the
          school year.
        </p>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {pendingRequests.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
              >
                <span>
                  <strong>{r.entityLabel}</strong>
                  <span className="text-muted-foreground"> · {r.kind.replace(/_/g, ' ')}</span>
                </span>
                <Badge
                  variant={
                    r.status === 'pending'
                      ? 'warning'
                      : r.status === 'approved'
                        ? 'success'
                        : 'default'
                  }
                >
                  {r.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const r = await listPendingApprovalsAction()
              if (!r.ok) return r
              return { ok: true as const }
            }, 'Refreshed requests.')
          }
        >
          Refresh status
        </Button>
      </section>

      {/* History / version control */}
      <section className="rounded-2xl border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-sky-600" />
          <h3 className="text-lg font-bold text-navy dark:text-sky-50">
            4. Version history (undo mistakes)
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Every create, enroll, and delete is logged. Restore puts the previous snapshot back.
        </p>
        {revisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No history yet — or run{' '}
            <code className="rounded bg-muted px-1">pending-013-roster-versions.sql</code>.
          </p>
        ) : (
          <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
            {revisions.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
              >
                <div>
                  <span className="font-medium">{r.action}</span>{' '}
                  <span className="text-muted-foreground">
                    {r.entityType} ·{' '}
                    {new Date(r.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                  {r.note && (
                    <p className="text-[11px] text-muted-foreground">{r.note}</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() =>
                    run(
                      () => restoreRevisionAction(r.id),
                      'Restored from history.'
                    )
                  }
                >
                  Undo / restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground flex items-center gap-1">
        <Users className="h-3.5 w-3.5" />
        Open a class for grades, attendance, and pulse once students are enrolled.
      </p>
    </div>
  )
}

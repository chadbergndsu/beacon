'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Check,
  Loader2,
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
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
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
    <div className="page-stack">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/80 pb-3">
        <div>
          <p className="text-[13px] font-medium text-foreground">
            {teacherName ? `${teacherName.split(' ')[0]}'s classroom` : 'My classroom'}
          </p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {classes.length} classes · {students.length} students
            {pendingRequests.filter((r) => r.status === 'pending').length > 0
              ? ` · ${pendingRequests.filter((r) => r.status === 'pending').length} pending approval`
              : ''}
            {' · '}
            <Link href="/teacher/settings" className="text-primary hover:underline">
              Settings
            </Link>
          </p>
        </div>
      </div>

      {msg ? (
        <p className="rounded-xl border border-emerald-200 bg-success-soft px-4 py-3 text-sm font-medium text-success">
          {msg}
        </p>
      ) : null}
      {err ? (
        <p className="rounded-xl border border-red-200 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {err}
        </p>
      ) : null}

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-[13px] font-medium text-foreground">1. Create Abeka classes</p>

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
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  gradeId === g.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted'
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
                ({selectedSubjects.length} selected)
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
          {selectedSubjects.length > 0 ? (
            <p className="mt-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground">
              Selected ({selectedSubjects.length}):{' '}
              {selectedSubjects
                .map((id) => availableSubjects.find((s) => s.id === id)?.short || id)
                .join(' · ')}
            </p>
          ) : null}
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
                    'relative rounded-xl border px-3 py-2.5 text-left text-sm transition',
                    on
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5'
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold leading-tight">{s.label}</span>
                    <span
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px]',
                        on
                          ? 'border-primary-foreground/40 bg-primary-foreground text-primary'
                          : 'border-border bg-transparent text-transparent'
                      )}
                    >
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  </span>
                  <span
                    className={cn(
                      'mt-1 block text-[11px] font-medium',
                      on ? 'text-primary-foreground/80' : 'text-muted-foreground'
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
          <Table className="border-t pt-3">
            <THead>
              <TR>
                <TH>Class</TH>
                <TH>Details</TH>
                <TH>Call #</TH>
                <TH className="text-right">Students</TH>
                <TH className="text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {classes.map((c) => (
                <TR key={c.id}>
                  <TD>
                    <Link
                      href={`/classes/${c.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">
                    {[c.subject, c.grade_level].filter(Boolean).join(' · ') || '—'}
                  </TD>
                  <TD>
                    {editCallId === c.id ? (
                      <div className="flex flex-wrap items-center gap-1">
                        <Input
                          className="h-8 w-28 font-mono text-xs"
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
                              const r = await updateClassCallNumberAction(c.id, editCallVal || null)
                              if (r.ok) setEditCallId(null)
                              return r
                            }, 'Call number saved.')
                          }
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="font-mono text-[12px] text-muted-foreground hover:text-primary"
                        onClick={() => {
                          setEditCallId(c.id)
                          setEditCallVal(c.call_number || '')
                        }}
                      >
                        {c.call_number || 'Add'}
                      </button>
                    )}
                  </TD>
                  <TD className="text-right tabular-nums">{c.enrollment_count}</TD>
                  <TD className="text-right">
                    <div className="inline-flex gap-1.5">
                      <Link href={`/classes/${c.id}`}>
                        <Button type="button" size="sm">
                          Gradebook
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="text-danger"
                        disabled={pending}
                        onClick={() =>
                          run(
                            () =>
                              requestDeletionAction({
                                kind: 'delete_class',
                                entityId: c.id,
                                reason: 'Teacher requested archive',
                              }),
                            'Archive request sent.'
                          )
                        }
                      >
                        Remove
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-[13px] font-medium text-foreground">2. Students</p>
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
          <Table>
            <THead>
              <TR>
                <TH>Student</TH>
                <TH>Grade</TH>
                <TH className="text-right" />
              </TR>
            </THead>
            <TBody>
              {students.map((s) => (
                <TR key={s.id}>
                  <TD>
                    <Link
                      href={`/students/${s.id}`}
                      className="font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {s.last_name}, {s.first_name}
                    </Link>
                  </TD>
                  <TD className="text-muted-foreground">{s.grade_level || '—'}</TD>
                  <TD className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      disabled={pending}
                      onClick={() =>
                        run(
                          () =>
                            requestDeletionAction({
                              kind: 'delete_student',
                              entityId: s.id,
                              reason: 'Teacher requested remove',
                            }),
                          'Delete request sent.'
                        )
                      }
                    >
                      Remove
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
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

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-foreground">3. Deletion requests</p>
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
            Refresh
          </Button>
        </div>
        {pendingRequests.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No requests yet.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Entity</TH>
                <TH>Type</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {pendingRequests.map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.entityLabel}</TD>
                  <TD className="text-muted-foreground">{r.kind.replace(/_/g, ' ')}</TD>
                  <TD>
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
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4">
        <p className="text-[13px] font-medium text-foreground">4. Version history</p>
        {revisions.length === 0 ? (
          <p className="text-[13px] text-muted-foreground">No history yet.</p>
        ) : (
          <Table>
            <THead>
              <TR>
                <TH>Action</TH>
                <TH>Entity</TH>
                <TH>When</TH>
                <TH className="text-right" />
              </TR>
            </THead>
            <TBody>
              {revisions.slice(0, 40).map((r) => (
                <TR key={r.id}>
                  <TD className="font-medium">{r.action}</TD>
                  <TD className="text-muted-foreground">{r.entityType}</TD>
                  <TD className="whitespace-nowrap text-[12px] text-muted-foreground">
                    {new Date(r.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </TD>
                  <TD className="text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending}
                      onClick={() => run(() => restoreRevisionAction(r.id), 'Restored.')}
                    >
                      Restore
                    </Button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}
      </section>
    </div>
  )
}

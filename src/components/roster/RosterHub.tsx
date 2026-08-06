'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
  Copy,
  KeyRound,
  Loader2,
  UserPlus,
  Users,
} from 'lucide-react'
import {
  assignTeacherToClassAction,
  createAbekaClassesAction,
  createClassAction,
  createPersonAccountAction,
  createStudentAction,
  enrollExistingStudentAction,
  importStudentsCsvAction,
  linkParentToStudentAction,
} from '@/app/actions/roster'
import {
  ABEKA_GRADES,
  coreSubjectsForGrade,
  suggestClassName,
  subjectsForGrade,
} from '@/lib/curriculum/abeka'
import { STUDENT_CSV_TEMPLATE } from '@/lib/roster/csv'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Field, FieldError } from '@/components/ui/field'
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type RosterStudent = {
  id: string
  first_name: string
  last_name: string
  grade_level: string | null
  active: boolean | null
}

export type RosterPerson = {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

export type RosterClass = {
  id: string
  name: string
  subject: string | null
  grade_level: string | null
  teacher_id: string | null
  enrollment_count: number
}

export function RosterHub({
  schoolName,
  students,
  teachers,
  parents,
  classes,
  parentLinks,
}: {
  schoolName: string
  students: RosterStudent[]
  teachers: RosterPerson[]
  parents: RosterPerson[]
  classes: RosterClass[]
  /** parent_id → student_id[] */
  parentLinks: { parent_id: string; student_id: string }[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [creds, setCreds] = useState<{
    email: string
    password: string
    name: string
    role: string
  } | null>(null)
  const [copied, setCopied] = useState(false)

  const linksByParent = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const l of parentLinks) {
      const arr = m.get(l.parent_id) ?? []
      arr.push(l.student_id)
      m.set(l.parent_id, arr)
    }
    return m
  }, [parentLinks])

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

  // —— Person you know (teacher / parent) ——
  const [personName, setPersonName] = useState('')
  const [personEmail, setPersonEmail] = useState('')
  const [personRole, setPersonRole] = useState<'teacher' | 'parent'>('teacher')
  const [linkStudentIds, setLinkStudentIds] = useState<string[]>([])

  function createPerson() {
    setMsg(null)
    setErr(null)
    setCreds(null)
    start(async () => {
      const r = await createPersonAccountAction({
        fullName: personName,
        email: personEmail,
        role: personRole,
        studentIds: personRole === 'parent' ? linkStudentIds : undefined,
      })
      if (!r.ok) {
        setErr(r.error)
        return
      }
      setCreds({
        email: r.email,
        password: r.tempPassword,
        name: personName.trim(),
        role: personRole,
      })
      setMsg(
        `${personRole === 'teacher' ? 'Teacher' : 'Parent'} account ready — copy the password now (shown once).`
      )
      setPersonName('')
      setPersonEmail('')
      setLinkStudentIds([])
      router.refresh()
    })
  }

  // —— Student ——
  const [sf, setSf] = useState('')
  const [sl, setSl] = useState('')
  const [sg, setSg] = useState('')
  const [sClass, setSClass] = useState('')

  // —— Class (Abeka-aware) ——
  const [cName, setCName] = useState('')
  const [cSubject, setCSubject] = useState('')
  const [cGrade, setCGrade] = useState('5')
  const [cTeacher, setCTeacher] = useState('')
  const [abeaSubjects, setAbeaSubjects] = useState<string[]>(() =>
    coreSubjectsForGrade('5').map((s) => s.id)
  )

  // —— CSV ——
  const [csv, setCsv] = useState('')

  // —— Enroll ——
  const [enClass, setEnClass] = useState(classes[0]?.id ?? '')
  const [enStudent, setEnStudent] = useState(students[0]?.id ?? '')

  // —— Link parent ——
  const [lpParent, setLpParent] = useState(parents[0]?.id ?? '')
  const [lpStudent, setLpStudent] = useState(students[0]?.id ?? '')

  async function copyCreds() {
    if (!creds) return
    const text = `Beacon login\nName: ${creds.name}\nRole: ${creds.role}\nEmail: ${creds.email}\nTemporary password: ${creds.password}\nURL: https://beacon.commoncentsip.com/login\n\nPlease sign in and change your password after first login.`
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="page-stack">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-border/80 pb-3">
        <div>
          <p className="text-[13px] font-medium text-foreground">School roster</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {schoolName} · {students.length} students · {teachers.length} teachers ·{' '}
            {parents.length} parents · {classes.length} classes
          </p>
        </div>
      </div>

      {msg ? (
        <p className="rounded-xl border border-success/25 bg-success-soft px-4 py-3 text-sm text-success">
          {msg}
        </p>
      ) : null}
      <FieldError>{err}</FieldError>

      {creds && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/40">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 text-amber-800" />
            <div className="min-w-0 flex-1">
              <p className="font-bold text-amber-950 dark:text-amber-100">
                Hand this to {creds.name} (copy now)
              </p>
              <dl className="mt-2 space-y-1 text-sm text-amber-950 dark:text-amber-50">
                <div>
                  <dt className="inline text-xs font-semibold uppercase text-amber-800">Email </dt>
                  <dd className="inline font-mono">{creds.email}</dd>
                </div>
                <div>
                  <dt className="inline text-xs font-semibold uppercase text-amber-800">
                    Temp password{' '}
                  </dt>
                  <dd className="inline font-mono font-bold">{creds.password}</dd>
                </div>
                <div>
                  <dt className="inline text-xs font-semibold uppercase text-amber-800">Login </dt>
                  <dd className="inline">
                    <a
                      className="underline"
                      href="https://beacon.commoncentsip.com/login"
                      target="_blank"
                      rel="noreferrer"
                    >
                      beacon.commoncentsip.com/login
                    </a>
                  </dd>
                </div>
              </dl>
              <Button
                type="button"
                size="sm"
                className="mt-3 gap-1.5"
                variant="outline"
                onClick={() => void copyCreds()}
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy login details'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 1. People you know */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <h2 className="text-[13px] font-medium text-foreground">
            1. Add someone you know (email login)
          </h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Teacher, parent, or office staff. Use their real email so they can sign in.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field>
            <Label htmlFor="pn">Full name</Label>
            <Input
              id="pn"
              placeholder="Jordan Lee"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
            />
          </Field>
          <Field>
            <Label htmlFor="pe">Email</Label>
            <Input
              id="pe"
              type="email"
              placeholder="jordan@school.org"
              value={personEmail}
              onChange={(e) => setPersonEmail(e.target.value)}
            />
          </Field>
          <Field className="sm:col-span-2">
            <Label>Role</Label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['teacher', 'Teacher'],
                  ['parent', 'Parent'],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPersonRole(v)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                    personRole === v
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-foreground hover:bg-muted'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </Field>
          {personRole === 'parent' && students.length > 0 && (
            <Field className="sm:col-span-2">
              <Label>Link to children (optional now)</Label>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border p-2 text-sm">
                {students.map((s) => {
                  const checked = linkStudentIds.includes(s.id)
                  return (
                    <li key={s.id}>
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted/60">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setLinkStudentIds((prev) =>
                              checked ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                            )
                          }}
                        />
                        {s.last_name}, {s.first_name}
                        {s.grade_level ? ` · ${s.grade_level}` : ''}
                      </label>
                    </li>
                  )
                })}
              </ul>
            </Field>
          )}
        </div>
        <Button
          type="button"
          className="mt-4"
          disabled={pending || !personName.trim() || !personEmail.trim()}
          onClick={createPerson}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Create login
        </Button>
      </section>

      {/* 2. Students */}
      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-[13px] font-medium text-foreground">2. Students</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Students do not need email. Add a few by hand, or paste a CSV.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <Field>
            <Label>First name</Label>
            <Input value={sf} onChange={(e) => setSf(e.target.value)} />
          </Field>
          <Field>
            <Label>Last name</Label>
            <Input value={sl} onChange={(e) => setSl(e.target.value)} />
          </Field>
          <Field>
            <Label>Grade</Label>
            <Input
              placeholder="5"
              value={sg}
              onChange={(e) => setSg(e.target.value)}
            />
          </Field>
          <Field>
            <Label>Class (optional)</Label>
            <Select value={sClass} onChange={(e) => setSClass(e.target.value)}>
              <option value="">— none yet —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Button
          type="button"
          className="mt-3"
          variant="outline"
          disabled={pending || !sf.trim() || !sl.trim()}
          onClick={() =>
            run(
              () =>
                createStudentAction({
                  firstName: sf,
                  lastName: sl,
                  gradeLevel: sg,
                  classId: sClass || null,
                }),
              'Student added.'
            )
          }
        >
          Add student
        </Button>

        <div className="mt-6 border-t pt-4">
          <Field>
            <Label>Or paste CSV</Label>
            <p className="text-[11px] text-muted-foreground">
              Headers: first_name, last_name, grade_level, parent_email, class
            </p>
            <Textarea
              className="font-mono text-xs"
              placeholder={STUDENT_CSV_TEMPLATE}
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
            />
          </Field>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setCsv(STUDENT_CSV_TEMPLATE)}
            >
              Load example
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || !csv.trim()}
              onClick={() => {
                setMsg(null)
                setErr(null)
                start(async () => {
                  const r = await importStudentsCsvAction(csv)
                  if (!r.ok) {
                    setErr(r.error)
                    return
                  }
                  setMsg(
                    `Imported ${r.created} students` +
                      (r.enrolled ? `, enrolled ${r.enrolled}` : '') +
                      (r.errors.length ? ` (${r.errors.length} notes)` : '')
                  )
                  if (r.errors.length) setErr(r.errors.slice(0, 5).join(' · '))
                  router.refresh()
                })
              }}
            >
              Import CSV
            </Button>
          </div>
        </div>

        {students.length > 0 && (
          <div className="mt-3">
            <Table className="min-w-0">
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Grade</TH>
                  <TH>Status</TH>
                </TR>
              </THead>
              <TBody>
                {students.slice(0, 100).map((s) => (
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
                    <TD>
                      <Badge variant={s.active === false ? 'warning' : 'success'}>
                        {s.active === false ? 'Inactive' : 'Active'}
                      </Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            {students.length > 100 && (
              <p className="border-t px-2.5 py-1.5 text-[12px] text-muted-foreground">
                Showing 100 of {students.length}
              </p>
            )}
          </div>
        )}
      </section>

      {/* 3. Classes — Abeka + assign teacher */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-[13px] font-medium text-foreground">3. Classes (Abeka)</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Build grade + subject classes and assign a teacher. Teachers can also self-serve under My
          classroom. Removals use Approvals &amp; history.
        </p>

        <div className="mt-4">
          <Label className="text-xs">Grade</Label>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {ABEKA_GRADES.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setCGrade(g.id)
                  setAbeaSubjects(coreSubjectsForGrade(g.id).map((s) => s.id))
                }}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
                  cGrade === g.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-foreground hover:bg-muted'
                )}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <Label className="text-xs">Abeka subjects to create</Label>
          <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {abeaSubjects.length > 0 && (
              <p className="mb-2 rounded-lg border border-primary/25 bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground sm:col-span-2 lg:col-span-3">
                Selected ({abeaSubjects.length})
              </p>
            )}
            {subjectsForGrade(cGrade).map((s) => {
              const on = abeaSubjects.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setAbeaSubjects((prev) =>
                      on ? prev.filter((x) => x !== s.id) : [...prev, s.id]
                    )
                  }
                  className={cn(
                    'rounded-xl border px-3 py-2.5 text-left text-sm transition',
                    on
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5'
                  )}
                >
                  <span className={on ? 'font-bold' : 'font-medium'}>{s.label}</span>
                  <span
                    className={cn(
                      'block text-[11px]',
                      on ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}
                  >
                    {suggestClassName(cGrade, s)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field>
            <Label>Assign teacher</Label>
            <Select value={cTeacher} onChange={(e) => setCTeacher(e.target.value)}>
              <option value="">— assign later —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.email}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              disabled={pending || abeaSubjects.length === 0}
              onClick={() =>
                run(
                  () =>
                    createAbekaClassesAction({
                      gradeId: cGrade,
                      subjectIds: abeaSubjects,
                      teacherId: cTeacher || null,
                    }),
                  'Abeka classes created.'
                )
              }
            >
              Create selected Abeka classes
            </Button>
          </div>
        </div>

        <div className="mt-4 grid gap-3 border-t pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field>
            <Label>Custom class name</Label>
            <Input
              placeholder="5th Grade Homeroom"
              value={cName}
              onChange={(e) => setCName(e.target.value)}
            />
          </Field>
          <Field>
            <Label>Subject</Label>
            <Input
              placeholder="Homeroom / Math"
              value={cSubject}
              onChange={(e) => setCSubject(e.target.value)}
            />
          </Field>
          <Field>
            <Label>Teacher</Label>
            <Select value={cTeacher} onChange={(e) => setCTeacher(e.target.value)}>
              <option value="">— assign later —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.full_name || t.email}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              disabled={pending || !cName.trim()}
              onClick={() =>
                run(
                  () =>
                    createClassAction({
                      name: cName,
                      subject: cSubject,
                      gradeLevel: cGrade,
                      teacherId: cTeacher || null,
                    }),
                  'Class created.'
                )
              }
            >
              Create one class
            </Button>
          </div>
        </div>

        {classes.length > 0 && (
          <Table className="mt-3">
            <THead>
              <TR>
                <TH>Class</TH>
                <TH>Details</TH>
                <TH className="text-right">Students</TH>
                <TH>Teacher</TH>
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
                  <TD className="text-right tabular-nums">{c.enrollment_count}</TD>
                  <TD>
                    <Select
                      className="h-8 min-w-[10rem] text-[12px]"
                      value={c.teacher_id || ''}
                      disabled={pending}
                      onChange={(e) =>
                        run(
                          () =>
                            assignTeacherToClassAction(c.id, e.target.value || null),
                          'Teacher assigned.'
                        )
                      }
                    >
                      <option value="">No teacher</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.full_name || t.email}
                        </option>
                      ))}
                    </Select>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        )}

        {classes.length > 0 && students.length > 0 && (
          <div className="mt-4 flex flex-wrap items-end gap-2 border-t pt-4">
            <Field>
              <Label className="text-xs">Enroll existing student</Label>
              <Select
                className="h-9 min-w-[12rem]"
                value={enStudent}
                onChange={(e) => setEnStudent(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.last_name}, {s.first_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label className="text-xs">Into class</Label>
              <Select
                className="h-9 min-w-[12rem]"
                value={enClass}
                onChange={(e) => setEnClass(e.target.value)}
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending || !enClass || !enStudent}
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

      {/* 4. Parent links */}
      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-[13px] font-medium text-foreground">
          4. Link parents to students
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          If you created a parent without kids checked, link them here so grades and Dinner Table
          work.
        </p>
        {parents.length === 0 || students.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Add at least one parent account and one student first.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap items-end gap-2">
            <Field>
              <Label className="text-xs">Parent</Label>
              <Select
                className="h-9 min-w-[12rem]"
                value={lpParent}
                onChange={(e) => setLpParent(e.target.value)}
              >
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </option>
                ))}
              </Select>
            </Field>
            <Field>
              <Label className="text-xs">Student</Label>
              <Select
                className="h-9 min-w-[12rem]"
                value={lpStudent}
                onChange={(e) => setLpStudent(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.last_name}, {s.first_name}
                  </option>
                ))}
              </Select>
            </Field>
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={() =>
                run(
                  () => linkParentToStudentAction(lpParent, lpStudent),
                  'Parent linked to student.'
                )
              }
            >
              Link
            </Button>
          </div>
        )}

        {parents.length > 0 && (
          <Table className="mt-3">
            <THead>
              <TR>
                <TH>Parent</TH>
                <TH>Email</TH>
                <TH>Linked students</TH>
              </TR>
            </THead>
            <TBody>
              {parents.map((p) => {
                const kids = linksByParent.get(p.id) ?? []
                return (
                  <TR key={p.id}>
                    <TD className="font-medium">{p.full_name || '—'}</TD>
                    <TD className="text-muted-foreground">{p.email || '—'}</TD>
                    <TD>
                      {kids.length === 0 ? (
                        <Badge variant="warning">None</Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {kids.map((sid) => {
                            const st = students.find((s) => s.id === sid)
                            return (
                              <Badge key={sid} variant="muted">
                                {st ? `${st.first_name} ${st.last_name}` : sid.slice(0, 6)}
                              </Badge>
                            )
                          })}
                        </div>
                      )}
                    </TD>
                  </TR>
                )
              })}
            </TBody>
          </Table>
        )}
      </section>

      {teachers.length > 0 && (
        <section className="rounded-xl border bg-muted/30 p-4 text-sm">
          <h3 className="font-semibold">Teachers with logins</h3>
          <ul className="mt-2 space-y-1">
            {teachers.map((t) => (
              <li key={t.id}>
                {t.full_name || '—'} · <span className="font-mono text-xs">{t.email}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

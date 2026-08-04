'use client'

import { useMemo, useState, useTransition } from 'react'
import { ClipboardList, Printer, Signature } from 'lucide-react'
import {
  loadScoreReportBundle,
  type ScoreReportBundle,
  type ScoreReportClassOption,
} from '@/app/actions/printables'
import {
  assignmentCompleteness,
  buildStudentScoreRows,
  defaultSelectedAssignmentIds,
  filterTestQuizInRange,
  formatDisplayDate,
  nextMondayYmd,
  previousSchoolWeekRange,
  schoolWeekRange,
  studentDisplayName,
  type ScoreReportAssignment,
} from '@/lib/printables/score-report'
import { printScopedSection } from '@/lib/printables/print-section'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function WeeklyScoreReport({
  classes,
  initialBundle = null,
  defaultTeacherName = '',
  schoolName = 'Our School',
}: {
  classes: ScoreReportClassOption[]
  initialBundle?: ScoreReportBundle | null
  defaultTeacherName?: string
  schoolName?: string
}) {
  const thisWeek = useMemo(() => schoolWeekRange(new Date()), [])
  const [classId, setClassId] = useState(
    initialBundle?.classId ?? classes[0]?.id ?? ''
  )
  const [from, setFrom] = useState(thisWeek.from)
  const [to, setTo] = useState(thisWeek.to)
  const [returnBy, setReturnBy] = useState(() => nextMondayYmd(new Date()))
  const [teacherName, setTeacherName] = useState(defaultTeacherName)
  const [onlyTestQuiz, setOnlyTestQuiz] = useState(true)
  const [includeUndated, setIncludeUndated] = useState(false)
  /** null = use auto “fully graded only”; otherwise explicit teacher picks */
  const [manualIds, setManualIds] = useState<string[] | null>(null)
  const [bundle, setBundle] = useState<ScoreReportBundle | null>(initialBundle)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function switchClass(id: string) {
    setClassId(id)
    setManualIds(null)
    setError(null)
    if (!id) {
      setBundle(null)
      return
    }
    if (initialBundle && id === initialBundle.classId) {
      setBundle(initialBundle)
      return
    }
    startTransition(async () => {
      const result = await loadScoreReportBundle(id)
      if (!result.ok) {
        setError(result.error)
        setBundle(null)
        return
      }
      setBundle(result.data)
    })
  }

  const studentIds = useMemo(
    () => (bundle?.students ?? []).map((s) => s.id),
    [bundle]
  )

  const candidates = useMemo(() => {
    if (!bundle) return [] as ScoreReportAssignment[]
    return filterTestQuizInRange(bundle.assignments, from, to, {
      onlyTestQuiz,
      includeUndated,
    })
  }, [bundle, from, to, onlyTestQuiz, includeUndated])

  const autoSelectedIds = useMemo(() => {
    if (!bundle) return [] as string[]
    return defaultSelectedAssignmentIds(candidates, studentIds, bundle.grades)
  }, [bundle, candidates, studentIds])

  const selectedIds = useMemo(() => {
    const base = manualIds ?? autoSelectedIds
    // Drop ids that left the candidate list after a date/filter change
    const allowed = new Set(candidates.map((a) => a.id))
    return new Set(base.filter((id) => allowed.has(id)))
  }, [manualIds, autoSelectedIds, candidates])

  const selectedAssignments = useMemo(
    () => candidates.filter((a) => selectedIds.has(a.id)),
    [candidates, selectedIds]
  )

  function toggleAssignment(id: string) {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setManualIds([...next])
  }

  function selectAllComplete() {
    if (!bundle) return
    setManualIds(
      defaultSelectedAssignmentIds(candidates, studentIds, bundle.grades)
    )
  }

  function selectAllCandidates() {
    setManualIds(candidates.map((a) => a.id))
  }

  function clearSelection() {
    setManualIds([])
  }

  function applyThisWeek() {
    const r = schoolWeekRange(new Date())
    setFrom(r.from)
    setTo(r.to)
    setReturnBy(nextMondayYmd(new Date()))
    setManualIds(null)
  }

  function applyLastWeek() {
    const r = previousSchoolWeekRange(new Date())
    setFrom(r.from)
    setTo(r.to)
    setManualIds(null)
  }

  const displayTeacher = teacherName.trim() || 'Teacher'
  const rangeLabel = `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`
  const students = bundle?.students ?? []

  return (
    <div className="space-y-8">
      <div className="print:hidden space-y-4 rounded-2xl border border-sky-200/80 bg-gradient-to-br from-sky-50 via-indigo-50/70 to-white p-5 shadow-sm dark:border-sky-900/50 dark:from-sky-950/40 dark:via-indigo-950/20 dark:to-slate-900">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-md shadow-sky-500/25">
            <ClipboardList className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-navy dark:text-sky-50">
              Weekly test &amp; quiz score sheet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
              Print one page per student for a date range you choose. Parents sign and return
              so you know they saw the scores. Pick only fully graded items so Friday&apos;s
              unfinished spelling test never lands on the sheet by accident.
            </p>
          </div>
        </div>

        {classes.length === 0 ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            No active classes yet. Add a class and roster in the gradebook, then come back to
            print score sheets.
          </p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <Label htmlFor="score-class">Class</Label>
                <select
                  id="score-class"
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={classId}
                  onChange={(e) => switchClass(e.target.value)}
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.subject ? ` · ${c.subject}` : ''}
                      {c.gradeLevel ? ` (${c.gradeLevel})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="score-from">From</Label>
                <Input
                  id="score-from"
                  type="date"
                  className="mt-1"
                  value={from}
                  onChange={(e) => {
                    setFrom(e.target.value)
                    setManualIds(null)
                  }}
                />
              </div>
              <div>
                <Label htmlFor="score-to">To</Label>
                <Input
                  id="score-to"
                  type="date"
                  className="mt-1"
                  value={to}
                  onChange={(e) => {
                    setTo(e.target.value)
                    setManualIds(null)
                  }}
                />
              </div>
              <div>
                <Label htmlFor="score-return">Return by (on sheet)</Label>
                <Input
                  id="score-return"
                  type="date"
                  className="mt-1"
                  value={returnBy}
                  onChange={(e) => setReturnBy(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="score-teacher">Teacher name</Label>
                <Input
                  id="score-teacher"
                  className="mt-1"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" onClick={applyThisWeek}>
                This school week (Mon–Fri)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={applyLastWeek}>
                Last school week
              </Button>
            </div>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={onlyTestQuiz}
                  onChange={(e) => {
                    setOnlyTestQuiz(e.target.checked)
                    setManualIds(null)
                  }}
                />
                Tests &amp; quizzes only
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeUndated}
                  onChange={(e) => {
                    setIncludeUndated(e.target.checked)
                    setManualIds(null)
                  }}
                />
                Include items with no due date
              </label>
            </div>

            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                {error}
              </p>
            )}

            {pending && (
              <p className="text-sm text-muted-foreground">Loading class grades…</p>
            )}

            {bundle && !pending && (
              <div className="space-y-3 rounded-xl border bg-white/80 p-4 dark:bg-slate-900/50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-sky-50">
                      Choose scores to include
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {bundle.students.length} student
                      {bundle.students.length === 1 ? '' : 's'} · Default: only fully graded
                      tests/quizzes in range
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={selectAllComplete}>
                      Fully graded only
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={selectAllCandidates}>
                      Select all listed
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={clearSelection}>
                      Clear
                    </Button>
                  </div>
                </div>

                {candidates.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No matching assignments in this date range. Widen the dates or turn off
                    &quot;Tests &amp; quizzes only.&quot;
                  </p>
                ) : (
                  <ul className="divide-y rounded-lg border">
                    {candidates.map((a) => {
                      const c = assignmentCompleteness(
                        a.id,
                        studentIds,
                        bundle.grades
                      )
                      const checked = selectedIds.has(a.id)
                      return (
                        <li key={a.id} className="flex items-start gap-3 px-3 py-2.5">
                          <input
                            type="checkbox"
                            className="mt-1"
                            id={`asg-${a.id}`}
                            checked={checked}
                            onChange={() => toggleAssignment(a.id)}
                          />
                          <label htmlFor={`asg-${a.id}`} className="min-w-0 flex-1 cursor-pointer">
                            <span className="font-medium text-slate-900 dark:text-sky-50">
                              {a.title}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {a.categoryName || 'Uncategorized'}
                              {a.dueDate ? ` · due ${formatDisplayDate(a.dueDate)}` : ' · no due date'}
                              {` · ${a.maxPoints} pts`}
                            </span>
                          </label>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              c.complete
                                ? 'bg-emerald-100 text-emerald-900'
                                : 'bg-amber-100 text-amber-950'
                            }`}
                          >
                            {c.complete
                              ? 'Fully graded'
                              : `${c.gradedCount}/${c.total} graded`}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                )}

                <p className="text-xs text-muted-foreground">
                  Selected: <strong>{selectedAssignments.length}</strong> assignment
                  {selectedAssignments.length === 1 ? '' : 's'} →{' '}
                  <strong>{students.length}</strong> sheet
                  {students.length === 1 ? '' : 's'}
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                className="mt-3"
                onClick={() => printScopedSection('score-sheets')}
                disabled={selectedAssignments.length === 0 || students.length === 0}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Print / Save PDF
              </Button>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Signature className="h-3.5 w-3.5" aria-hidden />
                One page per student · parent signs · return by{' '}
                {returnBy ? formatDisplayDate(returnBy) : 'Monday'}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Printable sheets */}
      <div className="score-report-print space-y-8">
        {!bundle || students.length === 0 || selectedAssignments.length === 0 ? (
          <div className="print:hidden rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-muted-foreground">
            Select a class, date range, and at least one fully graded score to preview sheets.
          </div>
        ) : (
          students.map((student) => {
            const rows = buildStudentScoreRows(
              student.id,
              selectedAssignments,
              bundle.grades
            )
            return (
              <section
                key={student.id}
                className="rounded-xl border border-slate-300 bg-white p-6 shadow-sm print:break-after-page print:break-inside-avoid print:border-slate-500 print:shadow-none print:rounded-none"
              >
                <header className="border-b border-slate-200 pb-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-sky-800">
                    {schoolName} · Parent signature report
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-slate-900">
                    Test &amp; quiz scores
                  </h3>
                  <div className="mt-2 grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
                    <p>
                      <span className="text-slate-500">Student:</span>{' '}
                      <strong>{studentDisplayName(student)}</strong>
                      {student.gradeLevel ? ` · Grade ${student.gradeLevel}` : ''}
                    </p>
                    <p>
                      <span className="text-slate-500">Class:</span>{' '}
                      <strong>{bundle.className}</strong>
                      {bundle.subject ? ` · ${bundle.subject}` : ''}
                    </p>
                    <p>
                      <span className="text-slate-500">Period:</span> {rangeLabel}
                    </p>
                    <p>
                      <span className="text-slate-500">Teacher:</span> {displayTeacher}
                    </p>
                  </div>
                </header>

                <table className="mt-4 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-800 text-left text-xs uppercase tracking-wide text-slate-600">
                      <th className="py-2 pr-2 font-semibold">Assignment</th>
                      <th className="py-2 pr-2 font-semibold">Due</th>
                      <th className="py-2 pr-2 font-semibold">Category</th>
                      <th className="py-2 text-right font-semibold">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.assignmentId} className="border-b border-slate-200">
                        <td className="py-2 pr-2 font-medium text-slate-900">{r.title}</td>
                        <td className="py-2 pr-2 text-slate-600">
                          {r.dueDate ? formatDisplayDate(r.dueDate) : '—'}
                        </td>
                        <td className="py-2 pr-2 text-slate-600">
                          {r.categoryName || '—'}
                        </td>
                        <td className="py-2 text-right font-semibold tabular-nums text-slate-900">
                          {r.display}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mt-6 rounded-lg border border-dashed border-slate-400 bg-slate-50/80 p-4 print:bg-white">
                  <p className="text-sm text-slate-800 leading-relaxed">
                    Please review these scores with your student, sign below, and return this
                    sheet to school by{' '}
                    <strong>
                      {returnBy ? formatDisplayDate(returnBy) : 'Monday'}
                    </strong>
                    . Thank you!
                  </p>
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Parent / guardian signature
                      </p>
                      <div className="mt-6 border-b border-slate-800" />
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        Date
                      </p>
                      <div className="mt-6 border-b border-slate-800" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Comments (optional)
                    </p>
                    <div className="mt-2 h-10 border-b border-slate-300" />
                    <div className="mt-3 h-10 border-b border-slate-300" />
                  </div>
                </div>

                <p className="mt-4 text-center text-[10px] text-slate-400">
                  Beacon · {schoolName} · Generated for classroom use
                </p>
              </section>
            )
          })
        )}
      </div>
    </div>
  )
}

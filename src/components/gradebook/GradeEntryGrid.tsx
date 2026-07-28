'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import { Download, Keyboard, Mail, Save, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { calculateTransparentGrade, getLetterGrade, validateCategoryWeights } from '@/lib/grades'
import type { Assignment, Grade, GradeCategory, Student } from '@/lib/types'

interface Props {
  students: Student[]
  assignments: Assignment[]
  initialGrades: Grade[]
  onSave?: (grades: Grade[], options: { notifyParents: boolean }) => Promise<void>
  onGradesChange?: (grades: Grade[]) => void
  exportHref?: string
  classTitle?: string
  categories?: GradeCategory[]
}

function cellKey(studentId: string, assignmentId: string) {
  return `${studentId}::${assignmentId}`
}

export function GradeEntryGrid({
  students,
  assignments,
  initialGrades,
  onSave,
  onGradesChange,
  exportHref,
  classTitle = 'Grade Entry',
  categories = [],
}: Props) {
  const [grades, setGrades] = useState<Grade[]>(initialGrades)
  const [saving, setSaving] = useState(false)
  const [notifyParents, setNotifyParents] = useState(false)
  const [focused, setFocused] = useState<{ r: number; c: number } | null>(null)
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  const getGrade = useCallback(
    (studentId: string, assignmentId: string) =>
      grades.find((g) => g.student_id === studentId && g.assignment_id === assignmentId),
    [grades]
  )

  const updateScore = (studentId: string, assignmentId: string, raw: string) => {
    const trimmed = raw.trim()
    const num = Number(trimmed)

    setGrades((prev) => {
      const existingIdx = prev.findIndex(
        (g) => g.student_id === studentId && g.assignment_id === assignmentId
      )

      // Clear cell completely
      if (trimmed === '') {
        if (existingIdx < 0) return prev
        const nextGrades = prev.filter((_, i) => i !== existingIdx)
        onGradesChange?.(nextGrades)
        return nextGrades
      }

      const next: Grade = {
        assignment_id: assignmentId,
        student_id: studentId,
        score: trimmed.toLowerCase() === 'm' ? null : Number.isFinite(num) ? num : null,
        is_missing: trimmed.toLowerCase() === 'm',
      }

      let nextGrades: Grade[]
      if (existingIdx >= 0) {
        const copy = [...prev]
        copy[existingIdx] = { ...copy[existingIdx], ...next }
        nextGrades = copy
      } else {
        nextGrades = [...prev, next]
      }
      onGradesChange?.(nextGrades)
      return nextGrades
    })
  }

  const studentSummaries = useMemo(() => {
    return students.map((s) => {
      const sg = grades.filter((g) => g.student_id === s.id)
      if (categories.length) {
        const r = calculateTransparentGrade(categories, assignments, sg)
        return {
          id: s.id,
          overall: r.overall,
          letter: r.letter,
          missing: r.missingCount,
        }
      }
      // Simple avg of entered percentages when no categories
      let sum = 0
      let n = 0
      let missing = 0
      for (const a of assignments) {
        const g = sg.find((x) => x.assignment_id === a.id)
        if (!g) continue
        if (g.is_missing || g.score == null) {
          missing++
          continue
        }
        const max = Number(a.max_points) || 100
        sum += (Number(g.score) / max) * 100
        n++
      }
      const overall = n ? Math.round((sum / n) * 10) / 10 : null
      return {
        id: s.id,
        overall,
        letter: overall != null ? getLetterGrade(overall) : null,
        missing,
      }
    })
  }, [students, grades, assignments, categories])

  const assignmentFill = useMemo(() => {
    return assignments.map((a) => {
      let entered = 0
      let missing = 0
      for (const s of students) {
        const g = getGrade(s.id, a.id)
        if (!g) continue
        if (g.is_missing) missing++
        else if (g.score != null) entered++
      }
      return { id: a.id, entered, missing, total: students.length }
    })
  }, [assignments, students, getGrade])

  const weightInfo = categories.length ? validateCategoryWeights(categories) : null
  const gradedCells = grades.filter((g) => g.is_missing || g.score != null).length

  const focusCell = (r: number, c: number) => {
    if (r < 0 || c < 0 || r >= students.length || c >= assignments.length) return
    const key = cellKey(students[r].id, assignments[c].id)
    const el = inputRefs.current.get(key)
    el?.focus()
    el?.select()
    setFocused({ r, c })
  }

  const onKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    r: number,
    c: number
  ) => {
    if (e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)) {
      e.preventDefault()
      focusCell(r, c + 1)
    } else if (e.key === 'ArrowLeft' || (e.key === 'Tab' && e.shiftKey)) {
      e.preventDefault()
      focusCell(r, c - 1)
    } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault()
      focusCell(r + 1, c)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      focusCell(r - 1, c)
    }
  }

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    try {
      await onSave(grades, { notifyParents })
    } finally {
      setSaving(false)
    }
  }

  if (!students.length) {
    return (
      <Card className="p-10 text-center animate-beacon-in">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950">
          <Sparkles className="h-6 w-6" />
        </div>
        <h3 className="text-lg font-semibold text-navy dark:text-sky-50">No students yet</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Enroll students under Class setup to start entering grades — just like Jupiter, but cleaner.
        </p>
      </Card>
    )
  }

  if (!assignments.length) {
    return (
      <Card className="p-10 text-center animate-beacon-in">
        <h3 className="text-lg font-semibold text-navy dark:text-sky-50">No assignments yet</h3>
        <p className="mt-2 text-sm text-muted-foreground max-w-sm mx-auto">
          Add categories and assignments in Class setup, then come back to enter scores fast.
        </p>
      </Card>
    )
  }

  return (
    <div className="space-y-4 animate-beacon-in">
      {/* Toolbar header */}
      <Card className="overflow-hidden border-sky-100/80 dark:border-sky-900/40">
        <div className="bg-gradient-to-r from-navy via-slate-900 to-sky-900 px-5 py-4 text-white">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-300/90">
                Academics · Class
              </p>
              <h2 className="mt-0.5 text-xl font-bold tracking-tight truncate">{classTitle}</h2>
              <p className="mt-1 text-sm text-slate-300">
                {students.length} students · {assignments.length} assignments · {gradedCells} scores
                entered
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {exportHref && (
                <a href={exportHref}>
                  <Button variant="outline" size="md" className="border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white">
                    <Download className="h-4 w-4" />
                    Export CSV
                  </Button>
                </a>
              )}
              <Button
                size="lg"
                onClick={handleSave}
                disabled={saving || !onSave}
                className="min-w-[140px] shadow-lg shadow-sky-500/20"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving…' : 'Save grades'}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-card px-5 py-3">
          <div className="flex flex-wrap items-center gap-2">
            {categories.length > 0 ? (
              categories.map((c) => (
                <Badge key={c.id} variant="sky">
                  {c.name}
                  <span className="opacity-70 font-normal">{c.weight}%</span>
                  {c.drop_lowest > 0 && (
                    <span className="opacity-60 font-normal">drop {c.drop_lowest}</span>
                  )}
                </Badge>
              ))
            ) : (
              <Badge variant="muted">No categories — simple averages</Badge>
            )}
            {weightInfo && !weightInfo.ok && (
              <Badge variant="warning">{weightInfo.message}</Badge>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-border/80 bg-muted/40 px-3 py-2 text-sm text-muted-foreground hover:bg-muted/70 transition">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
              checked={notifyParents}
              onChange={(e) => setNotifyParents(e.target.checked)}
            />
            <Mail className="h-3.5 w-3.5 text-sky-600" />
            Email parents on save
          </label>
        </div>
      </Card>

      {/* Spreadsheet — horizontal scroll on phones; sticky name col stays usable */}
      <Card className="overflow-hidden p-0">
        <p className="border-b border-border bg-sky-50/80 px-3 py-2 text-xs font-medium text-sky-900 sm:hidden dark:bg-sky-950/40 dark:text-sky-100">
          Swipe sideways for more assignments · or use{' '}
          <a href="/teacher/quick" className="font-bold underline">
            Quick mode
          </a>{' '}
          on phone
        </p>
        <div className="max-h-[min(70vh,720px)] overflow-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-[520px] border-separate border-spacing-0 text-sm">
            <thead className="sticky top-0 z-30">
              <tr>
                <th
                  className={cn(
                    'sticky left-0 z-40 min-w-[120px] max-w-[140px] border-b border-r border-border sm:min-w-[200px] sm:max-w-none',
                    'bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md',
                    'px-2 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:px-4'
                  )}
                >
                  Student
                </th>
                {assignments.map((a, ci) => {
                  const fill = assignmentFill.find((f) => f.id === a.id)
                  return (
                    <th
                      key={a.id}
                      className={cn(
                        'min-w-[88px] max-w-[104px] border-b border-border sm:min-w-[104px] sm:max-w-[120px]',
                        'bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md',
                        'px-1 py-2.5 text-center font-semibold text-navy dark:text-sky-50 sm:px-2',
                        focused?.c === ci && 'bg-sky-50/95 dark:bg-sky-950/80'
                      )}
                      title={a.title}
                    >
                      <div className="truncate text-[12px] leading-tight px-0.5 sm:text-[13px]">{a.title}</div>
                      <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                        <span>{a.max_points} pts</span>
                        {a.is_extra_credit && <Badge variant="sky" className="px-1.5 py-0 text-[9px]">XC</Badge>}
                      </div>
                      {fill && (
                        <div className="mt-1.5 mx-1 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden sm:mx-2">
                          <div
                            className="h-full rounded-full bg-sky-500/80 transition-all"
                            style={{
                              width: `${fill.total ? ((fill.entered + fill.missing) / fill.total) * 100 : 0}%`,
                            }}
                          />
                        </div>
                      )}
                    </th>
                  )
                })}
                <th
                  className={cn(
                    'sticky right-0 z-40 min-w-[64px] border-b border-l border-border sm:min-w-[88px]',
                    'bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md',
                    'px-1.5 py-3 text-center text-[11px] font-bold uppercase tracking-wider text-muted-foreground sm:px-3'
                  )}
                >
                  Avg
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, ri) => {
                const summary = studentSummaries.find((s) => s.id === student.id)
                const rowHot = focused?.r === ri
                return (
                  <tr key={student.id} className="group">
                    <td
                      className={cn(
                        'sticky left-0 z-20 border-b border-r border-border',
                        'bg-card group-hover:bg-sky-50/50 dark:group-hover:bg-sky-950/30',
                        rowHot && 'bg-sky-50/80 dark:bg-sky-950/40',
                        'px-2 py-1.5 sm:px-4'
                      )}
                    >
                      <div className="font-semibold text-[12px] text-navy dark:text-sky-50 leading-tight sm:text-[13px]">
                        {student.last_name}, {student.first_name}
                      </div>
                      {student.grade_level && (
                        <div className="text-[11px] text-muted-foreground">Gr. {student.grade_level}</div>
                      )}
                    </td>
                    {assignments.map((a, ci) => {
                      const g = getGrade(student.id, a.id)
                      const isMissing = Boolean(g?.is_missing)
                      const display = isMissing ? 'M' : g?.score ?? ''
                      const key = cellKey(student.id, a.id)
                      const isFocus = focused?.r === ri && focused?.c === ci
                      return (
                        <td
                          key={a.id}
                          className={cn(
                            'border-b border-border p-0.5',
                            'bg-card group-hover:bg-sky-50/30 dark:group-hover:bg-sky-950/20',
                            isFocus && 'bg-sky-50 dark:bg-sky-950/50'
                          )}
                        >
                          <input
                            ref={(el) => {
                              if (el) inputRefs.current.set(key, el)
                              else inputRefs.current.delete(key)
                            }}
                            data-row={ri}
                            data-col={ci}
                            className={cn(
                              'grade-cell-input w-full min-h-[44px] rounded-lg border px-1 py-2 text-center text-[14px] tabular-nums font-medium sm:min-h-0 sm:px-1.5 sm:text-[13px]',
                              'bg-transparent border-transparent hover:border-border hover:bg-white dark:hover:bg-slate-900',
                              'focus:outline-none focus:ring-2 focus:ring-sky-400/70 focus:border-sky-300 focus:bg-white dark:focus:bg-slate-900',
                              isMissing &&
                                'bg-warning-soft/80 text-warning font-bold tracking-wide border-amber-200/60',
                              !isMissing &&
                                g?.score != null &&
                                'text-navy dark:text-sky-100'
                            )}
                            value={display === 0 || display ? String(display) : ''}
                            placeholder="—"
                            inputMode="decimal"
                            autoComplete="off"
                            aria-label={`${student.last_name} ${a.title}`}
                            onFocus={() => setFocused({ r: ri, c: ci })}
                            onChange={(e) => updateScore(student.id, a.id, e.target.value)}
                            onKeyDown={(e) => onKeyDown(e, ri, ci)}
                          />
                        </td>
                      )
                    })}
                    <td
                      className={cn(
                        'sticky right-0 z-20 border-b border-l border-border',
                        'bg-card group-hover:bg-sky-50/50 dark:group-hover:bg-sky-950/30',
                        rowHot && 'bg-sky-50/80 dark:bg-sky-950/40',
                        'px-1.5 py-2 text-center sm:px-3'
                      )}
                    >
                      {summary?.overall != null ? (
                        <div>
                          <div className="text-sm font-bold tabular-nums text-navy dark:text-sky-50">
                            {summary.overall}%
                          </div>
                          {summary.letter && (
                            <div className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                              {summary.letter}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-muted/30 px-4 py-3">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <Keyboard className="h-3.5 w-3.5" />
              Arrows / Enter / Tab move cells
            </span>
            <span>
              Type a score or{' '}
              <kbd className="rounded-md border bg-card px-1.5 py-0.5 font-semibold text-warning shadow-sm">
                M
              </kbd>{' '}
              for missing
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Changes stay local until you save</p>
        </div>
      </Card>
    </div>
  )
}

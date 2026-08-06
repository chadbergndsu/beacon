'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from 'lucide-react'
import { removeLessonPlan, saveLessonPlan } from '@/app/actions/lessons'
import type { LessonPlan } from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

type PreviewMode = 'day' | 'week'

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  const day = x.getDay() // 0 Sun … 6 Sat
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function formatDayHeader(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatWeekRange(monday: Date): string {
  const friday = addDays(monday, 4)
  const a = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const b = friday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${a} – ${b}`
}

function statusVariant(status: LessonPlan['status']): 'success' | 'sky' | 'muted' {
  if (status === 'taught') return 'success'
  if (status === 'ready') return 'sky'
  return 'muted'
}

/** Full lesson body — Jen: expand to see the whole lesson */
function LessonDetail({ plan }: { plan: LessonPlan }) {
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-foreground">
      {plan.unit && (
        <p>
          <span className="font-semibold text-sky-800 dark:text-sky-300">Topic: </span>
          {plan.unit}
        </p>
      )}
      {plan.scripture && (
        <p>
          <span className="font-semibold text-sky-800 dark:text-sky-300">Scripture: </span>
          {plan.scripture}
        </p>
      )}
      <p>
        <span className="font-semibold">Objectives: </span>
        {plan.objectives}
      </p>
      {plan.materials && (
        <p>
          <span className="font-semibold">Materials: </span>
          {plan.materials}
        </p>
      )}
      <p className="whitespace-pre-wrap">
        <span className="font-semibold">Procedures / activities: </span>
        {plan.activities}
      </p>
      {plan.homework && (
        <p>
          <span className="font-semibold">Homework: </span>
          {plan.homework}
        </p>
      )}
      {plan.assessment && (
        <p>
          <span className="font-semibold">Evaluation: </span>
          {plan.assessment}
        </p>
      )}
      {plan.differentiation && (
        <p>
          <span className="font-semibold">Differentiation: </span>
          {plan.differentiation}
        </p>
      )}
      {plan.durationMinutes ? (
        <p className="text-xs text-muted-foreground">{plan.durationMinutes} minutes</p>
      ) : null}
    </div>
  )
}

function LessonCell({
  plan,
  expanded,
  onToggle,
  onDelete,
  pending,
}: {
  plan: LessonPlan
  expanded: boolean
  onToggle: () => void
  onDelete: () => void
  pending: boolean
}) {
  return (
    <div
      className={cn(
        'rounded-lg border text-left transition',
        expanded
          ? 'border-sky-300 bg-sky-50/80 dark:border-sky-700 dark:bg-sky-950/40'
          : 'border-border/80 bg-card hover:border-sky-200'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-1.5 px-2.5 py-2 text-left"
        aria-expanded={expanded}
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wide text-sky-800 dark:text-sky-300 line-clamp-1">
            {plan.title}
          </p>
          {plan.unit && (
            <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">
              Topic: {plan.unit}
            </p>
          )}
          <Badge variant={statusVariant(plan.status)} className="mt-1 text-[10px]">
            {plan.status}
          </Badge>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            expanded && 'rotate-180 text-sky-600'
          )}
          aria-hidden
        />
      </button>
      {expanded && (
        <div className="border-t border-border/70 px-2.5 py-2.5 space-y-2">
          <LessonDetail plan={plan} />
          <Button
            size="sm"
            variant="outline"
            disabled={pending}
            className="h-8 text-red-700 border-red-200"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      )}
    </div>
  )
}

export function LessonPlansPanel({
  classId,
  className,
  plans: initial,
}: {
  classId: string
  className?: string
  plans: LessonPlan[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [mode, setMode] = useState<PreviewMode>('week')
  const [anchor, setAnchor] = useState(() => startOfWeekMonday(new Date()))
  const [selectedDay, setSelectedDay] = useState(() => isoDate(new Date()))
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(() => isoDate(new Date()))

  const weekDays = useMemo(
    () => [0, 1, 2, 3, 4].map((i) => addDays(anchor, i)),
    [anchor]
  )

  const plansByDate = useMemo(() => {
    const m = new Map<string, LessonPlan[]>()
    for (const p of initial) {
      const list = m.get(p.date) || []
      list.push(p)
      m.set(p.date, list)
    }
    return m
  }, [initial])

  function openAdd(date: string) {
    setFormDate(date)
    setShowForm(true)
    setOk(null)
    setError(null)
    // scroll form into view after paint
    requestAnimationFrame(() => {
      document.getElementById('lesson-plan-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  function shiftWeek(delta: number) {
    setAnchor((a) => addDays(a, delta * 7))
  }

  function shiftDay(delta: number) {
    const d = new Date(selectedDay + 'T12:00:00')
    d.setDate(d.getDate() + delta)
    setSelectedDay(isoDate(d))
    setAnchor(startOfWeekMonday(d))
  }

  const dayPlans = plansByDate.get(selectedDay) || []

  return (
    <div className="space-y-6 animate-beacon-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Academics
          </p>
          <h2 className="text-xl font-bold text-navy dark:text-sky-50">Lesson plan preview</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            {className ? (
              <>
                <strong className="text-foreground">{className}</strong>
                {' — '}
              </>
            ) : null}
            Switch Day or Week, then tap the down arrow to open the full lesson (objectives,
            procedures, homework).
          </p>
        </div>
        <Badge variant="sky">
          {initial.length} plan{initial.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* Preview controls — mirrors SchoolWorx: Preview Day | Week */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-800 px-4 py-3 text-white">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold tracking-wide">Preview</span>
            <div className="inline-flex rounded-lg bg-white/10 p-0.5">
              {(['day', 'week'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-semibold capitalize transition',
                    mode === m ? 'bg-white text-slate-900 shadow' : 'text-white/85 hover:bg-white/10'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label="Previous"
              onClick={() => (mode === 'week' ? shiftWeek(-1) : shiftDay(-1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[9rem] text-center text-sm font-medium">
              {mode === 'week' ? formatWeekRange(anchor) : formatDayHeader(new Date(selectedDay + 'T12:00:00'))}
            </span>
            <button
              type="button"
              className="rounded-lg p-2 hover:bg-white/10"
              aria-label="Next"
              onClick={() => (mode === 'week' ? shiftWeek(1) : shiftDay(1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <Button
              size="sm"
              className="ml-2 bg-sky-500 hover:bg-sky-400 text-white"
              onClick={() => openAdd(mode === 'day' ? selectedDay : isoDate(weekDays[0]))}
            >
              <Plus className="h-3.5 w-3.5" />
              Add lesson
            </Button>
          </div>
        </div>

        {mode === 'week' ? (
          <div className="overflow-x-auto">
            <div className="grid min-w-[720px] grid-cols-5 divide-x divide-border">
              {weekDays.map((d) => {
                const date = isoDate(d)
                const plans = plansByDate.get(date) || []
                const isToday = date === isoDate(new Date())
                return (
                  <div key={date} className="min-h-[200px] flex flex-col bg-card">
                    <div
                      className={cn(
                        'border-b border-border px-2 py-2 text-center text-xs font-bold',
                        isToday
                          ? 'bg-sky-700 text-white'
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-100'
                      )}
                    >
                      {formatDayHeader(d)}
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-2">
                      {plans.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => openAdd(date)}
                          className="flex flex-1 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border px-2 py-6 text-center text-xs text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
                        >
                          <span className="font-semibold uppercase tracking-wide text-[10px] text-sky-800 dark:text-sky-300">
                            {className || 'Class'}
                          </span>
                          <span>Click to add lesson plan.</span>
                          <ChevronDown className="mt-1 h-4 w-4 opacity-40" aria-hidden />
                        </button>
                      ) : (
                        plans.map((plan) => (
                          <LessonCell
                            key={plan.id}
                            plan={plan}
                            expanded={expanded === plan.id}
                            pending={pending}
                            onToggle={() =>
                              setExpanded((id) => (id === plan.id ? null : plan.id))
                            }
                            onDelete={() => {
                              if (!confirm('Delete this lesson plan?')) return
                              start(async () => {
                                try {
                                  const res = await removeLessonPlan(classId, plan.id)
                                  if (!res.ok) {
                                    setError(res.error)
                                    return
                                  }
                                  setOk('Lesson plan deleted.')
                                  setExpanded(null)
                                  router.refresh()
                                } catch (err) {
                                  setError(
                                    err instanceof Error
                                      ? err.message
                                      : 'Could not delete lesson plan.'
                                  )
                                }
                              })
                            }}
                          />
                        ))
                      )}
                      {plans.length > 0 && (
                        <button
                          type="button"
                          onClick={() => openAdd(date)}
                          className="mt-auto rounded-md py-1 text-[11px] font-semibold text-sky-700 hover:underline"
                        >
                          + Add another
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              {className || 'Class'} · {formatDayHeader(new Date(selectedDay + 'T12:00:00'))}
            </p>
            {dayPlans.length === 0 ? (
              <button
                type="button"
                onClick={() => openAdd(selectedDay)}
                className="flex w-full flex-col items-center gap-1 rounded-xl border border-dashed border-border py-12 text-sm text-muted-foreground hover:border-primary/40 hover:bg-primary/5"
              >
                Click to add lesson plan for this day.
                <ChevronDown className="h-4 w-4 opacity-50" />
              </button>
            ) : (
              dayPlans.map((plan) => (
                <LessonCell
                  key={plan.id}
                  plan={plan}
                  expanded={expanded === plan.id || dayPlans.length === 1}
                  pending={pending}
                  onToggle={() => setExpanded((id) => (id === plan.id ? null : plan.id))}
                  onDelete={() => {
                    if (!confirm('Delete this lesson plan?')) return
                    start(async () => {
                      const res = await removeLessonPlan(classId, plan.id)
                      if (!res.ok) {
                        setError(res.error)
                        return
                      }
                      setOk('Lesson plan deleted.')
                      router.refresh()
                    })
                  }}
                />
              ))
            )}
          </div>
        )}
      </Card>

      {/* Create form */}
      <Card id="lesson-plan-form" className="overflow-hidden border-sky-100/80">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 border-b border-border bg-gradient-to-r from-sky-50 to-transparent px-5 py-4 text-left dark:from-sky-950/40"
          onClick={() => setShowForm((v) => !v)}
        >
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-sky-600" />
            {showForm ? 'New lesson plan' : 'New lesson plan (tap to expand)'}
          </h3>
          <ChevronDown
            className={cn('h-4 w-4 text-muted-foreground transition', showForm && 'rotate-180')}
          />
        </button>
        {showForm && (
          <CardContent className="pt-5">
            <form
              className="grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault()
                const form = e.currentTarget
                const fd = new FormData(form)
                setError(null)
                setOk(null)
                start(async () => {
                  try {
                    const res = await saveLessonPlan(classId, {
                      title: String(fd.get('title') || ''),
                      date: String(fd.get('date') || ''),
                      unit: String(fd.get('unit') || ''),
                      objectives: String(fd.get('objectives') || ''),
                      materials: String(fd.get('materials') || ''),
                      activities: String(fd.get('activities') || ''),
                      scripture: String(fd.get('scripture') || ''),
                      homework: String(fd.get('homework') || ''),
                      differentiation: String(fd.get('differentiation') || ''),
                      assessment: String(fd.get('assessment') || ''),
                      durationMinutes: Number(fd.get('duration') || 45),
                      status: String(fd.get('status') || 'ready') as LessonPlan['status'],
                    })
                    if (!res.ok) {
                      setError(res.error || 'Save failed.')
                      return
                    }
                    setOk('Lesson plan saved.')
                    const savedDate = String(fd.get('date') || '')
                    if (savedDate) {
                      setSelectedDay(savedDate)
                      setAnchor(startOfWeekMonday(new Date(savedDate + 'T12:00:00')))
                    }
                    try {
                      form.reset()
                    } catch {
                      /* form may unmount */
                    }
                    router.refresh()
                  } catch (err) {
                    setError(
                      err instanceof Error
                        ? err.message
                        : 'Could not save. Stay on this page and try again.'
                    )
                  }
                })
              }}
            >
              <Field className="sm:col-span-2">
                <Label htmlFor="title">Lesson title</Label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. Spelling · List 7"
                />
              </Field>
              <Field>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  name="date"
                  type="date"
                  required
                  key={formDate}
                  defaultValue={formDate}
                />
              </Field>
              <Field>
                <Label htmlFor="duration">Minutes</Label>
                <Input id="duration" name="duration" type="number" min={5} defaultValue={45} />
              </Field>
              <Field>
                <Label htmlFor="unit">Topic / unit</Label>
                <Input id="unit" name="unit" placeholder="Lesson 38 · List 7" />
              </Field>
              <Field>
                <Label htmlFor="status">Status</Label>
                <Select id="status" name="status" defaultValue="ready">
                  <option value="draft">Draft</option>
                  <option value="ready">Ready</option>
                  <option value="taught">Taught</option>
                </Select>
              </Field>
              <Field className="sm:col-span-2">
                <Label htmlFor="scripture">Scripture / character focus</Label>
                <Input
                  id="scripture"
                  name="scripture"
                  placeholder="e.g. Colossians 3:23 — work heartily"
                />
              </Field>
              <Field className="sm:col-span-2">
                <Label htmlFor="objectives">Learning objectives</Label>
                <Textarea
                  id="objectives"
                  name="objectives"
                  required
                  rows={2}
                  placeholder="Students will be able to…"
                />
              </Field>
              <Field className="sm:col-span-2">
                <Label htmlFor="materials">Materials</Label>
                <Textarea id="materials" name="materials" rows={2} />
              </Field>
              <Field className="sm:col-span-2">
                <Label htmlFor="activities">Procedures / activities</Label>
                <Textarea
                  id="activities"
                  name="activities"
                  required
                  rows={3}
                  placeholder="Hook → teach → practice → close"
                />
              </Field>
              <Field>
                <Label htmlFor="homework">Homework</Label>
                <Input id="homework" name="homework" placeholder="List 7 worksheet" />
              </Field>
              <Field>
                <Label htmlFor="assessment">Evaluation</Label>
                <Input id="assessment" name="assessment" placeholder="Exit ticket, oral check…" />
              </Field>
              <Field className="sm:col-span-2">
                <Label htmlFor="differentiation">Differentiation / support</Label>
                <Input
                  id="differentiation"
                  name="differentiation"
                  placeholder="Scaffolding, enrichment…"
                />
              </Field>
              {error && (
                <p className="text-sm text-red-600 sm:col-span-2" role="alert">
                  {error}
                </p>
              )}
              {ok && <p className="text-sm text-emerald-700 sm:col-span-2">{ok}</p>}
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <Button type="submit" disabled={pending} size="lg">
                  {pending ? 'Saving…' : 'Save lesson plan'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

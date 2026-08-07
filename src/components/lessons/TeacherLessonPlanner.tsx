'use client'

/**
 * Teacher Day/Week planner — SchoolWorx-style.
 * Day: subjects stack with full lesson; "Done for today" hides without deleting.
 */

import { useCallback, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react'
import { setLessonPlanStatus } from '@/app/actions/lessons'
import type { LessonPlan } from '@/lib/school-modules/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'

export type TeacherClass = {
  id: string
  name: string
  subject: string | null
  grade_level: string | null
}

type PreviewMode = 'day' | 'week'

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  const day = x.getDay()
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

function formatLongDay(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatShortDay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatWeekRange(monday: Date): string {
  const fri = addDays(monday, 4)
  return `${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${fri.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function classLabel(c: TeacherClass): string {
  return c.subject?.trim() || c.name
}

function DayLessonBlock({
  classRow,
  plan,
  defaultOpen = true,
  onDoneForToday,
  onRestore,
  pending,
}: {
  classRow: TeacherClass
  plan: LessonPlan | null
  defaultOpen?: boolean
  onDoneForToday?: () => void
  onRestore?: () => void
  pending?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const label = classLabel(classRow)
  const isTaught = plan?.status === 'taught'

  return (
    <section
      className={cn(
        'border-b border-border last:border-b-0',
        isTaught && 'opacity-90'
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 bg-muted/40 px-4 py-3 text-left hover:bg-muted/60"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">
            {classRow.name}
            {classRow.grade_level ? ` · Grade ${classRow.grade_level}` : ''}
            {plan?.durationMinutes ? ` · ${plan.durationMinutes} min` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {plan ? (
            <Badge
              variant={
                plan.status === 'taught' ? 'success' : plan.status === 'ready' ? 'sky' : 'muted'
              }
            >
              {plan.status === 'taught' ? 'done' : plan.status}
            </Badge>
          ) : (
            <Badge variant="muted">No plan</Badge>
          )}
          <ChevronDown
            className={cn(
              'h-5 w-5 text-slate-500 transition-transform',
              open && 'rotate-180 text-primary'
            )}
          />
        </div>
      </button>

      {open && (
        <div className="px-4 py-4 space-y-2.5 text-sm leading-relaxed bg-white dark:bg-slate-950">
          {!plan ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-muted-foreground">
              <p>No lesson plan for this day.</p>
              <Link
                href={`/classes/${classRow.id}?tab=lessons`}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
              >
                Add in class lesson plans
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <>
              <p>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Topic: </span>
                {plan.unit || plan.title}
              </p>
              {plan.unit && plan.title !== plan.unit && (
                <p className="text-xs text-muted-foreground">{plan.title}</p>
              )}
              <p>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Objectives:{' '}
                </span>
                {plan.objectives}
              </p>
              {plan.materials && (
                <p>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Materials:{' '}
                  </span>
                  {plan.materials}
                </p>
              )}
              <p className="whitespace-pre-wrap">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Procedures:{' '}
                </span>
                {plan.activities}
              </p>
              {plan.homework && (
                <p>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Homework:{' '}
                  </span>
                  {plan.homework}
                </p>
              )}
              {plan.assessment && (
                <p>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Evaluation:{' '}
                  </span>
                  {plan.assessment}
                </p>
              )}
              {plan.scripture && (
                <p>
                  <span className="font-semibold text-sky-800 dark:text-sky-300">
                    Scripture:{' '}
                  </span>
                  {plan.scripture}
                </p>
              )}
              {plan.differentiation && (
                <p>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Differentiation:{' '}
                  </span>
                  {plan.differentiation}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border/70">
                {plan.status !== 'taught' && onDoneForToday && (
                  <Button
                    type="button"
                    size="sm"
                    disabled={pending}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDoneForToday()
                    }}
                  >
                    <Check className="h-3.5 w-3.5" />
                    {pending ? 'Saving…' : 'Done for today'}
                  </Button>
                )}
                {plan.status === 'taught' && onRestore && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={(e) => {
                      e.stopPropagation()
                      onRestore()
                    }}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {pending ? 'Saving…' : 'Bring back to day view'}
                  </Button>
                )}
                <Link
                  href={`/classes/${classRow.id}?tab=lessons`}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Edit in class
                  <ExternalLink className="h-3 w-3" />
                </Link>
                {plan.status !== 'taught' && (
                  <p className="w-full text-[11px] text-muted-foreground">
                    Done for today removes this subject from your Day list — the plan is kept, not
                    deleted.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  )
}

export function TeacherLessonPlanner({
  teacherName,
  classes,
  plans: initialPlans,
}: {
  teacherName: string
  classes: TeacherClass[]
  plans: LessonPlan[]
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  // Default Week — matches SchoolWorx planning board Jen prefers
  const [mode, setMode] = useState<PreviewMode>('week')
  const [selectedDay, setSelectedDay] = useState(() => isoDate(new Date()))
  const [anchor, setAnchor] = useState(() => startOfWeekMonday(new Date()))
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)
  /** Day view: hide taught subjects (completed) by default */
  const [showCompleted, setShowCompleted] = useState(false)
  /** Optimistic status overrides after Done for today */
  const [statusOverride, setStatusOverride] = useState<Record<string, LessonPlan['status']>>({})
  const [actionError, setActionError] = useState<string | null>(null)

  const plans = useMemo(() => {
    return initialPlans.map((p) =>
      statusOverride[p.id] ? { ...p, status: statusOverride[p.id] } : p
    )
  }, [initialPlans, statusOverride])

  const weekDays = useMemo(() => [0, 1, 2, 3, 4].map((i) => addDays(anchor, i)), [anchor])

  const sortedClasses = useMemo(
    () =>
      [...classes].sort((a, b) =>
        classLabel(a).localeCompare(classLabel(b), undefined, { sensitivity: 'base' })
      ),
    [classes]
  )

  const planFor = useCallback(
    (classId: string, date: string): LessonPlan | null => {
      const matches = plans.filter((p) => p.classId === classId && p.date === date)
      if (!matches.length) return null
      return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    },
    [plans]
  )

  /** Day list: remaining work only unless showCompleted */
  const dayRows = useMemo(() => {
    return sortedClasses
      .map((c) => ({ classRow: c, plan: planFor(c.id, selectedDay) }))
      .filter(({ plan }) => {
        if (showCompleted) return true
        // Hide subjects already done for today
        if (plan?.status === 'taught') return false
        return true
      })
  }, [sortedClasses, planFor, selectedDay, showCompleted])

  const completedCount = useMemo(() => {
    return sortedClasses.filter((c) => planFor(c.id, selectedDay)?.status === 'taught').length
  }, [sortedClasses, planFor, selectedDay])

  function shiftDay(n: number) {
    const d = new Date(selectedDay + 'T12:00:00')
    d.setDate(d.getDate() + n)
    const iso = isoDate(d)
    setSelectedDay(iso)
    setAnchor(startOfWeekMonday(d))
  }

  function shiftWeek(n: number) {
    setAnchor((a) => {
      const next = addDays(a, n * 7)
      setSelectedDay(isoDate(next))
      return next
    })
  }

  function updateStatus(classId: string, plan: LessonPlan, status: LessonPlan['status']) {
    setActionError(null)
    setStatusOverride((prev) => ({ ...prev, [plan.id]: status }))
    start(async () => {
      const res = await setLessonPlanStatus(classId, plan.id, status)
      if (!res.ok) {
        setActionError(res.error)
        setStatusOverride((prev) => {
          const next = { ...prev }
          delete next[plan.id]
          return next
        })
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="page-stack animate-beacon-in">
      <PageHeader
        eyebrow="Lesson plan"
        title="My day & week"
        description={
          <>
            <strong className="text-foreground">Week</strong> is the planning board (Mon–Fri cards per
            subject). <strong className="text-foreground">Day</strong> is for teaching — full lessons
            stacked, with <strong className="text-foreground">Done for today</strong> to clear a
            subject without deleting the plan.
          </>
        }
        actions={
          <Link href="/teacher/calendar" className="text-[12px] font-medium text-primary hover:underline">
            Assignment calendar →
          </Link>
        }
      />

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">Teacher:</span>
            <span className="rounded-md border border-border bg-card px-3 py-1.5 text-[13px] font-medium">
              {teacherName}
            </span>
            <span className="text-muted-foreground">›</span>
            <span className="font-medium text-foreground">
              {mode === 'day'
                ? formatLongDay(selectedDay)
                : `Week of ${formatWeekRange(anchor)}`}
            </span>
            {mode === 'day' && completedCount > 0 && (
              <Badge variant="success" className="ml-1">
                {completedCount} done today
              </Badge>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] font-medium text-muted-foreground">Preview:</span>
            <div className="inline-flex rounded-md border border-border bg-card p-0.5">
              {(['day', 'week'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-[13px] font-medium capitalize',
                    mode === m
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="flex items-center rounded-lg border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800">
              <button
                type="button"
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700"
                aria-label="Previous"
                onClick={() => (mode === 'day' ? shiftDay(-1) : shiftWeek(-1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-slate-50 dark:hover:bg-slate-700"
                aria-label="Next"
                onClick={() => (mode === 'day' ? shiftDay(1) : shiftWeek(1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800"
              onClick={() => {
                const t = isoDate(new Date())
                setSelectedDay(t)
                setAnchor(startOfWeekMonday(new Date()))
              }}
            >
              Today
            </button>
            {mode === 'day' && (
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold',
                  showCompleted
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800'
                )}
              >
                {showCompleted ? (
                  <Eye className="h-3.5 w-3.5" />
                ) : (
                  <EyeOff className="h-3.5 w-3.5" />
                )}
                {showCompleted ? 'Hiding done' : 'Show completed'}
              </button>
            )}
          </div>
        </div>

        {actionError && (
          <p className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800" role="alert">
            {actionError}
          </p>
        )}

        {mode === 'day' ? (
          <div className="bg-white dark:bg-slate-950">
            {sortedClasses.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No classes assigned. Ask your admin to set you as teacher on classes.
              </p>
            ) : dayRows.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                  All done for this day
                </p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Every subject with a plan is marked complete. Nothing was deleted — turn on{' '}
                  <strong>Show completed</strong> to review or bring a subject back.
                </p>
                {completedCount > 0 && (
                  <Button size="sm" variant="outline" onClick={() => setShowCompleted(true)}>
                    <Eye className="h-3.5 w-3.5" />
                    Show {completedCount} completed
                  </Button>
                )}
              </div>
            ) : (
              dayRows.map(({ classRow, plan }) => (
                <DayLessonBlock
                  key={classRow.id}
                  classRow={classRow}
                  plan={plan}
                  defaultOpen={plan?.status !== 'taught'}
                  pending={pending}
                  onDoneForToday={
                    plan
                      ? () => updateStatus(classRow.id, plan, 'taught')
                      : undefined
                  }
                  onRestore={
                    plan?.status === 'taught'
                      ? () => updateStatus(classRow.id, plan, 'ready')
                      : undefined
                  }
                />
              ))
            )}
          </div>
        ) : (
          /* SchoolWorx-style week board: subject rows × Mon–Fri cards */
          <div className="overflow-x-auto bg-muted/30">
            <div
              className="grid min-w-[900px] border-b border-border"
              style={{ gridTemplateColumns: `repeat(5, minmax(0, 1fr))` }}
            >
              {weekDays.map((d) => {
                const date = isoDate(d)
                const isToday = date === isoDate(new Date())
                return (
                  <div
                    key={date}
                    className={cn(
                      'border-r border-border px-2 py-2.5 text-center text-[11px] font-medium last:border-r-0',
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    )}
                  >
                    {formatShortDay(d)}
                  </div>
                )
              })}
            </div>

            {sortedClasses.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No classes assigned.</p>
            ) : (
              sortedClasses.map((c) => (
                <div
                  key={c.id}
                  className="grid min-w-[900px] border-b border-border"
                  style={{ gridTemplateColumns: `repeat(5, minmax(0, 1fr))` }}
                >
                  {weekDays.map((d) => {
                    const date = isoDate(d)
                    const plan = planFor(c.id, date)
                    const key = `${c.id}:${date}`
                    const open = expandedWeek === key
                    const taught = plan?.status === 'taught'
                    const label = classLabel(c)

                    if (!plan) {
                      return (
                        <div
                          key={date}
                          className="min-h-[140px] border-r border-border bg-card p-2 last:border-r-0"
                        >
                          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            {label}
                          </p>
                          <Link
                            href={`/classes/${c.id}?tab=lessons`}
                            className="mt-2 flex min-h-[88px] flex-col items-center justify-center rounded-md border border-dashed border-border px-1 text-center text-[11px] text-muted-foreground hover:border-primary/40 hover:bg-muted/40"
                          >
                            Click to add lesson plan.
                            <ChevronDown className="mt-1 h-4 w-4 text-muted-foreground" />
                          </Link>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={date}
                        className={cn(
                          'min-h-[140px] border-r border-border bg-card p-2 last:border-r-0',
                          open && 'bg-muted/40'
                        )}
                      >
                        {/* Card chrome — subject + complete check */}
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[10px] font-medium uppercase tracking-wide text-foreground">
                            {label}
                          </p>
                          <div className="flex shrink-0 items-center gap-0.5">
                            <button
                              type="button"
                              title={taught ? 'Mark not done' : 'Mark done'}
                              disabled={pending}
                              className={cn(
                                'rounded p-0.5',
                                taught
                                  ? 'text-emerald-600'
                                  : 'text-slate-300 hover:text-emerald-600'
                              )}
                              onClick={() =>
                                updateStatus(c.id, plan, taught ? 'ready' : 'taught')
                              }
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Collapsed preview — Topic + Objectives like SchoolWorx */}
                        <button
                          type="button"
                          className="mt-1 w-full text-left"
                          onClick={() => setExpandedWeek(open ? null : key)}
                        >
                          <p className="text-[11px] leading-snug text-slate-800 dark:text-slate-100">
                            <span className="font-semibold">Topic: </span>
                            <span className="line-clamp-2">{plan.unit || plan.title}</span>
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-slate-700 dark:text-slate-200">
                            <span className="font-semibold">Objectives: </span>
                            <span className="line-clamp-2">{plan.objectives}</span>
                          </p>
                          <div className="mt-1.5 flex justify-center">
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 text-slate-400 transition',
                                open && 'rotate-180 text-primary'
                              )}
                            />
                          </div>
                        </button>

                        {/* Expanded full lesson */}
                        {open && (
                          <div className="mt-2 space-y-1.5 border-t border-slate-200 pt-2 text-[11px] leading-snug text-slate-800 dark:border-slate-700 dark:text-slate-100">
                            {plan.materials && (
                              <p>
                                <span className="font-semibold">Materials: </span>
                                {plan.materials}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap">
                              <span className="font-semibold">Procedures: </span>
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
                            {plan.scripture && (
                              <p>
                                <span className="font-semibold text-sky-800 dark:text-sky-300">
                                  Scripture:{' '}
                                </span>
                                {plan.scripture}
                              </p>
                            )}
                            <Link
                              href={`/classes/${c.id}?tab=lessons`}
                              className="inline-flex items-center gap-1 pt-1 text-[11px] font-medium text-primary hover:underline"
                            >
                              Edit
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

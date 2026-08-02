'use client'

/**
 * Teacher Day/Week planner — SchoolWorx-style.
 * Day: subjects stack with full lesson; "Done for today" hides without deleting.
 */

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Check,
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
        'border-b border-slate-200 last:border-b-0 dark:border-slate-700',
        isTaught && 'opacity-90'
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 bg-slate-50/90 px-4 py-3 text-left hover:bg-slate-100 dark:bg-slate-900/60 dark:hover:bg-slate-900"
      >
        <div className="min-w-0">
          <p className="font-bold uppercase tracking-wide text-sky-900 dark:text-sky-200">
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
              open && 'rotate-180 text-sky-600'
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
                className="mt-2 inline-flex items-center gap-1 font-semibold text-sky-700 hover:underline"
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
                  className="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:underline"
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
  const [mode, setMode] = useState<PreviewMode>('day')
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

  function planFor(classId: string, date: string): LessonPlan | null {
    const matches = plans.filter((p) => p.classId === classId && p.date === date)
    if (!matches.length) return null
    return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
  }

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
  }, [sortedClasses, plans, selectedDay, showCompleted])

  const completedCount = useMemo(() => {
    return sortedClasses.filter((c) => planFor(c.id, selectedDay)?.status === 'taught').length
  }, [sortedClasses, plans, selectedDay])

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
    <div className="space-y-4 animate-beacon-in">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
          Lesson Plan
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-navy dark:text-sky-50">
          My day &amp; week
        </h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          <strong className="text-foreground">Day</strong> view shows what’s left to teach. Tap{' '}
          <strong className="text-foreground">Done for today</strong> to clear a subject from the
          list — the plan is saved, not deleted. Switch to{' '}
          <strong className="text-foreground">Week</strong> for the grid.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm dark:border-slate-700">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-slate-100 px-4 py-3 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-slate-700 dark:text-slate-200">Teacher:</span>
            <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium dark:border-slate-600 dark:bg-slate-800">
              {teacherName}
            </span>
            <span className="text-slate-400">›</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
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
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Preview:
            </span>
            <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-800">
              {(['day', 'week'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-semibold capitalize',
                    mode === m
                      ? 'bg-sky-600 text-white shadow'
                      : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-700'
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
          <div className="overflow-x-auto bg-white dark:bg-slate-950">
            <table className="w-full min-w-[800px] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="sticky left-0 z-10 bg-slate-800 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide">
                    Class
                  </th>
                  {weekDays.map((d) => (
                    <th
                      key={isoDate(d)}
                      className={cn(
                        'px-2 py-2.5 text-center text-xs font-bold',
                        isoDate(d) === isoDate(new Date()) && 'bg-sky-700'
                      )}
                    >
                      {formatShortDay(d)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedClasses.map((c) => (
                  <tr key={c.id} className="border-b border-border align-top">
                    <td className="sticky left-0 z-10 border-r border-border bg-slate-50 px-3 py-2 font-bold uppercase tracking-wide text-sky-900 dark:bg-slate-900 dark:text-sky-200">
                      <Link href={`/classes/${c.id}?tab=lessons`} className="hover:underline">
                        {classLabel(c)}
                      </Link>
                    </td>
                    {weekDays.map((d) => {
                      const date = isoDate(d)
                      const plan = planFor(c.id, date)
                      const key = `${c.id}:${date}`
                      const open = expandedWeek === key
                      const taught = plan?.status === 'taught'
                      return (
                        <td key={date} className="border-l border-border p-1.5 align-top">
                          {!plan ? (
                            <Link
                              href={`/classes/${c.id}?tab=lessons`}
                              className="flex min-h-[72px] flex-col items-center justify-center rounded-md border border-dashed border-slate-200 px-1 py-2 text-center text-[11px] text-muted-foreground hover:border-sky-300 hover:bg-sky-50/50"
                            >
                              Click to add
                              <ChevronDown className="mt-0.5 h-3.5 w-3.5 opacity-40" />
                            </Link>
                          ) : (
                            <div
                              className={cn(
                                'rounded-md border text-left',
                                taught && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20',
                                open &&
                                  !taught &&
                                  'border-sky-300 bg-sky-50 dark:border-sky-700 dark:bg-sky-950/40',
                                !open && !taught && 'border-slate-200 bg-card'
                              )}
                            >
                              <button
                                type="button"
                                className="flex w-full items-start gap-1 px-2 py-1.5"
                                onClick={() => setExpandedWeek(open ? null : key)}
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-bold leading-snug line-clamp-2">
                                    {taught ? '✓ ' : ''}
                                    {plan.unit || plan.title}
                                  </p>
                                  <p className="mt-0.5 line-clamp-2 text-[10px] text-muted-foreground">
                                    {plan.objectives}
                                  </p>
                                </div>
                                <ChevronDown
                                  className={cn(
                                    'h-3.5 w-3.5 shrink-0 text-slate-400 transition',
                                    open && 'rotate-180 text-sky-600'
                                  )}
                                />
                              </button>
                              {open && (
                                <div className="space-y-1.5 border-t border-border px-2 py-2 text-[11px] leading-snug">
                                  <p>
                                    <strong>Objectives:</strong> {plan.objectives}
                                  </p>
                                  {plan.materials && (
                                    <p>
                                      <strong>Materials:</strong> {plan.materials}
                                    </p>
                                  )}
                                  <p className="whitespace-pre-wrap">
                                    <strong>Procedures:</strong> {plan.activities}
                                  </p>
                                  {plan.homework && (
                                    <p>
                                      <strong>Homework:</strong> {plan.homework}
                                    </p>
                                  )}
                                  {plan.assessment && (
                                    <p>
                                      <strong>Evaluation:</strong> {plan.assessment}
                                    </p>
                                  )}
                                  {plan.status !== 'taught' ? (
                                    <button
                                      type="button"
                                      disabled={pending}
                                      className="mt-1 font-semibold text-emerald-700 hover:underline"
                                      onClick={() => updateStatus(c.id, plan, 'taught')}
                                    >
                                      Done for today
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={pending}
                                      className="mt-1 font-semibold text-sky-700 hover:underline"
                                      onClick={() => updateStatus(c.id, plan, 'ready')}
                                    >
                                      Undo done
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {sortedClasses.length === 0 && (
              <p className="p-8 text-center text-sm text-muted-foreground">No classes assigned.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

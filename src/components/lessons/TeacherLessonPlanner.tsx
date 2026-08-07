'use client'

/**
 * Teacher Day/Week planner — SchoolWorx-style.
 * Week: All Classes Weekly Overview (accordion quick view → full Mon–Fri).
 * Day: subjects stack with full lesson; "Done for today" hides without deleting.
 */

import { useCallback, useMemo, useState, useTransition, useSyncExternalStore } from 'react'
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
  Printer,
  RotateCcw,
  Upload,
  Send,
} from 'lucide-react'
import { setLessonPlanStatus } from '@/app/actions/lessons'
import type { LessonPlan } from '@/lib/school-modules/types'
import { classLabel, type TeacherClass } from '@/lib/lessons/types'
import {
  addDays,
  formatLongDay,
  formatWeekRange,
  isoDate,
  startOfWeekMonday,
  weekDayDates,
} from '@/lib/lessons/week-dates'
import { ClassWeekSection } from '@/components/lessons/ClassWeekSection'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'

export type { TeacherClass } from '@/lib/lessons/types'

type PreviewMode = 'day' | 'week'

const OPEN_STORAGE_KEY = 'beacon:lesson-week-open-classes'

function readOpenClassIds(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(OPEN_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === 'string')) {
      return parsed
    }
  } catch {
    /* ignore */
  }
  return []
}

function writeOpenClassIds(ids: string[]) {
  try {
    localStorage.setItem(OPEN_STORAGE_KEY, JSON.stringify(ids))
    window.dispatchEvent(new Event('beacon-lesson-open-change'))
  } catch {
    /* ignore */
  }
}

function subscribeOpenClassIds(onStoreChange: () => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onStoreChange()
  window.addEventListener('storage', handler)
  window.addEventListener('beacon-lesson-open-change', handler)
  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener('beacon-lesson-open-change', handler)
  }
}

function getOpenClassIdsSnapshot(): string {
  return JSON.stringify(readOpenClassIds())
}

function getOpenClassIdsServerSnapshot(): string {
  return '[]'
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
  const headerId = `day-lesson-header-${classRow.id}`
  const panelId = `day-lesson-panel-${classRow.id}`

  return (
    <section className={cn('border-b border-border last:border-b-0', isTaught && 'opacity-90')}>
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 bg-muted/40 px-4 py-3 text-left hover:bg-muted/60"
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">
            {classRow.name}
            {classRow.grade_level ? ` · Grade ${classRow.grade_level}` : ''}
            {classRow.periodTime ? ` · ${classRow.periodTime}` : ''}
            {plan?.durationMinutes ? ` · ${plan.durationMinutes} min` : ''}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
              'h-5 w-5 text-slate-500 transition-transform duration-200',
              open && 'rotate-180 text-primary'
            )}
          />
        </div>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
          <div className="space-y-2.5 bg-white px-4 py-4 text-sm leading-relaxed dark:bg-slate-950">
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
                    <span className="font-semibold text-sky-800 dark:text-sky-300">Scripture: </span>
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

                <div className="flex flex-wrap items-center gap-2 border-t border-border/70 pt-3">
                  {plan.status !== 'taught' && onDoneForToday && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={pending}
                      className="bg-emerald-600 text-white hover:bg-emerald-500"
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
                  {!classRow.id.startsWith('demo-') ? (
                    <Link
                      href={`/classes/${classRow.id}?tab=lessons`}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Edit in class
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export function TeacherLessonPlanner({
  teacherName,
  classes,
  plans: initialPlans,
  demoMode = false,
}: {
  teacherName: string
  classes: TeacherClass[]
  plans: LessonPlan[]
  /** When true, status toggles are local-only (sample week). */
  demoMode?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [mode, setMode] = useState<PreviewMode>('week')
  const [selectedDay, setSelectedDay] = useState(() => isoDate(new Date()))
  const [anchor, setAnchor] = useState(() => startOfWeekMonday(new Date()))
  const [expandedDayKey, setExpandedDayKey] = useState<string | null>(null)
  const openClassIdsJson = useSyncExternalStore(
    subscribeOpenClassIds,
    getOpenClassIdsSnapshot,
    getOpenClassIdsServerSnapshot
  )
  const openClassIds = useMemo(() => {
    try {
      return JSON.parse(openClassIdsJson) as string[]
    } catch {
      return []
    }
  }, [openClassIdsJson])
  const [showCompleted, setShowCompleted] = useState(false)
  const [statusOverride, setStatusOverride] = useState<Record<string, LessonPlan['status']>>({})
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionNote, setActionNote] = useState<string | null>(null)

  const plans = useMemo(() => {
    return initialPlans.map((p) =>
      statusOverride[p.id] ? { ...p, status: statusOverride[p.id]! } : p
    )
  }, [initialPlans, statusOverride])

  const weekDays = useMemo(() => weekDayDates(anchor), [anchor])

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
      return matches.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null
    },
    [plans]
  )

  const dayRows = useMemo(() => {
    return sortedClasses
      .map((c) => ({ classRow: c, plan: planFor(c.id, selectedDay) }))
      .filter(({ plan }) => {
        if (showCompleted) return true
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
    if (demoMode || plan.id.startsWith('demo-')) return
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

  function toggleClassOpen(classId: string) {
    const next = openClassIds.includes(classId)
      ? openClassIds.filter((id) => id !== classId)
      : [...openClassIds, classId]
    writeOpenClassIds(next)
  }

  function expandAll() {
    writeOpenClassIds(sortedClasses.map((c) => c.id))
  }

  function collapseAll() {
    writeOpenClassIds([])
    setExpandedDayKey(null)
  }

  return (
    <div className="page-stack animate-beacon-in print:block">
      <PageHeader
        eyebrow="Lesson plan"
        title="All Classes Weekly Overview"
        description={
          <>
            Scan every class for the week in one place — expand any subject for the full Mon–Fri
            plan (Topic, Objectives, Materials, Homework, Procedures, Evaluation). Day view stays
            available for teaching.
          </>
        }
        actions={
          <Link href="/teacher/calendar" className="text-[12px] font-medium text-primary hover:underline">
            Assignment calendar →
          </Link>
        }
      />

      <div className="overflow-hidden rounded-lg border border-border print:border-0">
        {/* Header — teacher, week range, nav, actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/40 px-4 py-3 print:bg-white">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-muted-foreground">Teacher:</span>
            <span className="rounded-md border border-border bg-card px-3 py-1.5 text-[13px] font-medium">
              {teacherName}
            </span>
            <span className="text-muted-foreground">›</span>
            <span className="font-medium text-foreground">
              {mode === 'day'
                ? formatLongDay(selectedDay)
                : `${formatWeekRange(anchor)}`}
            </span>
            {mode === 'day' && completedCount > 0 && (
              <Badge variant="success" className="ml-1">
                {completedCount} done today
              </Badge>
            )}
            {demoMode ? <Badge variant="sky">Demo week</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 print:hidden">
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
                  {m === 'week' ? 'Week' : 'Day'}
                </button>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Previous week"
              onClick={() => (mode === 'day' ? shiftDay(-7) : shiftWeek(-1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Prev Week
            </Button>
            <div className="flex items-center rounded-lg border border-border bg-card">
              <button
                type="button"
                className="p-2 hover:bg-muted"
                aria-label="Previous"
                onClick={() => (mode === 'day' ? shiftDay(-1) : shiftWeek(-1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="p-2 hover:bg-muted"
                aria-label="Next"
                onClick={() => (mode === 'day' ? shiftDay(1) : shiftWeek(1))}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-xs font-semibold hover:bg-muted"
              onClick={() => {
                const t = isoDate(new Date())
                setSelectedDay(t)
                setAnchor(startOfWeekMonday(new Date()))
              }}
            >
              Today
            </button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setActionNote('Import from file is not wired yet — use class lesson plans to add.')
                window.setTimeout(() => setActionNote(null), 4000)
              }}
            >
              <Upload className="h-3.5 w-3.5" />
              Import
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setActionNote(
                  'Publish Entire Week marks ready plans for families later — not enabled in this build.'
                )
                window.setTimeout(() => setActionNote(null), 4500)
              }}
            >
              <Send className="h-3.5 w-3.5" />
              Publish Entire Week
            </Button>
            {mode === 'day' && (
              <button
                type="button"
                onClick={() => setShowCompleted((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold',
                  showCompleted
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-100'
                    : 'border-border bg-card'
                )}
              >
                {showCompleted ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
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
        {actionNote && (
          <p className="border-b border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-900" role="status">
            {actionNote}
          </p>
        )}

        {mode === 'day' ? (
          <div className="bg-white dark:bg-slate-950">
            {sortedClasses.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                No classes assigned. Ask your admin to set you as teacher on classes.
              </p>
            ) : dayRows.length === 0 ? (
              <div className="space-y-3 p-10 text-center">
                <p className="text-lg font-semibold text-emerald-800 dark:text-emerald-300">
                  All done for this day
                </p>
                <p className="mx-auto max-w-md text-sm text-muted-foreground">
                  Every subject with a plan is marked complete. Turn on{' '}
                  <strong>Show completed</strong> to review.
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
                  onDoneForToday={plan ? () => updateStatus(classRow.id, plan, 'taught') : undefined}
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
          <div className="bg-card">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/20 px-4 py-2.5 print:hidden">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Quick view</strong> shows each class’s week at a
                glance — expand for the full plan.
              </p>
              <div className="flex items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={expandAll}>
                  Expand All
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={collapseAll}>
                  Collapse All
                </Button>
              </div>
            </div>

            {sortedClasses.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">No classes assigned.</p>
            ) : (
              sortedClasses.map((c) => (
                <ClassWeekSection
                  key={c.id}
                  classRow={c}
                  weekDays={weekDays}
                  planFor={planFor}
                  open={openClassIds.includes(c.id)}
                  onToggle={() => toggleClassOpen(c.id)}
                  expandedDayKey={expandedDayKey}
                  onExpandDay={setExpandedDayKey}
                  pending={pending}
                  onToggleTaught={(classId, plan, taught) =>
                    updateStatus(classId, plan, taught ? 'taught' : 'ready')
                  }
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}

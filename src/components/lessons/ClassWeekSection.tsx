'use client'

/**
 * One class in the All-Classes Weekly Overview:
 * collapsed = quick week scan; expanded = full Mon–Fri lesson cards.
 */

import Link from 'next/link'
import {
  BookOpen,
  Calculator,
  ChevronDown,
  ExternalLink,
  Globe2,
  Heart,
  Music,
  Pencil,
  FlaskConical,
  CheckCircle2,
} from 'lucide-react'
import type { LessonPlan } from '@/lib/school-modules/types'
import { classLabel, type TeacherClass } from '@/lib/lessons/types'
import { formatShortDay, isoDate } from '@/lib/lessons/week-dates'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function SubjectIcon({ icon }: { icon?: TeacherClass['icon'] }) {
  const cls = 'h-4 w-4 shrink-0 text-primary'
  switch (icon) {
    case 'pencil':
      return <Pencil className={cls} aria-hidden />
    case 'calc':
      return <Calculator className={cls} aria-hidden />
    case 'globe':
      return <Globe2 className={cls} aria-hidden />
    case 'heart':
      return <Heart className={cls} aria-hidden />
    case 'music':
      return <Music className={cls} aria-hidden />
    case 'science':
      return <FlaskConical className={cls} aria-hidden />
    case 'book':
    default:
      return <BookOpen className={cls} aria-hidden />
  }
}

function topicOf(plan: LessonPlan | null): string {
  if (!plan) return '—'
  return plan.unit || plan.title
}

function objectivesPreview(plan: LessonPlan | null): string {
  if (!plan?.objectives) return ''
  return plan.objectives.replace(/\n/g, ' · ').slice(0, 140)
}

function FullLessonFields({ plan }: { plan: LessonPlan }) {
  const objectiveLines = plan.objectives
    .split('\n')
    .map((l) => l.replace(/^•\s*/, '').trim())
    .filter(Boolean)

  return (
    <div className="mt-2 space-y-1.5 border-t border-border/70 pt-2 text-[11px] leading-snug text-foreground">
      <p>
        <span className="font-semibold">Topic: </span>
        {plan.unit || plan.title}
      </p>
      {plan.unit && plan.title !== plan.unit ? (
        <p className="text-muted-foreground">{plan.title}</p>
      ) : null}
      <div>
        <span className="font-semibold">Objectives: </span>
        {objectiveLines.length > 1 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {objectiveLines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        ) : (
          <span>{plan.objectives}</span>
        )}
      </div>
      {plan.materials ? (
        <p>
          <span className="font-semibold">Materials: </span>
          {plan.materials}
        </p>
      ) : null}
      <p className="whitespace-pre-wrap">
        <span className="font-semibold">Procedures: </span>
        {plan.activities}
      </p>
      {plan.homework ? (
        <p>
          <span className="font-semibold">Homework: </span>
          {plan.homework}
        </p>
      ) : null}
      {plan.assessment ? (
        <p>
          <span className="font-semibold">Evaluation: </span>
          {plan.assessment}
        </p>
      ) : null}
      {plan.scripture ? (
        <p>
          <span className="font-semibold text-sky-800 dark:text-sky-300">Scripture: </span>
          {plan.scripture}
        </p>
      ) : null}
      {plan.differentiation ? (
        <p>
          <span className="font-semibold">Differentiation: </span>
          {plan.differentiation}
        </p>
      ) : null}
    </div>
  )
}

export function ClassWeekSection({
  classRow,
  weekDays,
  planFor,
  open,
  onToggle,
  expandedDayKey,
  onExpandDay,
  pending,
  onToggleTaught,
}: {
  classRow: TeacherClass
  weekDays: Date[]
  planFor: (classId: string, date: string) => LessonPlan | null
  open: boolean
  onToggle: () => void
  expandedDayKey: string | null
  onExpandDay: (key: string | null) => void
  pending?: boolean
  onToggleTaught?: (classId: string, plan: LessonPlan, taught: boolean) => void
}) {
  const label = classLabel(classRow)
  const dayPlans = weekDays.map((d) => {
    const date = isoDate(d)
    return { date, day: d, plan: planFor(classRow.id, date) }
  })
  const plannedCount = dayPlans.filter((d) => d.plan).length
  const headerId = `class-week-header-${classRow.id}`
  const panelId = `class-week-panel-${classRow.id}`

  return (
    <section className="border-b border-border last:border-b-0">
      <h3 className="sr-only">{label} weekly overview</h3>
      <button
        type="button"
        id={headerId}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className={cn(
          'flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors',
          open ? 'bg-muted/50' : 'bg-card hover:bg-muted/40'
        )}
      >
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <SubjectIcon icon={classRow.icon} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-foreground">{label}</span>
            {classRow.periodTime ? (
              <span className="rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {classRow.periodTime}
              </span>
            ) : null}
            <Badge variant="muted">{plannedCount}/5 days</Badge>
          </span>
          {classRow.grade_level ? (
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Grade {classRow.grade_level}
              {classRow.name !== label ? ` · ${classRow.name}` : ''}
            </span>
          ) : null}

          {/* Quick view — scannable Mon–Fri topics */}
          {!open ? (
            <span className="mt-2.5 grid grid-cols-5 gap-1.5">
              {dayPlans.map(({ date, day, plan }) => (
                <span
                  key={date}
                  className="rounded-md border border-border/80 bg-muted/30 px-1.5 py-1.5"
                >
                  <span className="block text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {day.toLocaleDateString('en-US', { weekday: 'short' })}
                  </span>
                  <span className="mt-0.5 block line-clamp-2 text-[10px] leading-snug text-foreground">
                    {topicOf(plan)}
                  </span>
                </span>
              ))}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn(
            'mt-2 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200',
            open && 'rotate-180 text-primary'
          )}
          aria-hidden
        />
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
          <div className="border-t border-border bg-muted/20 px-2 py-3 sm:px-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs text-muted-foreground">
                Full week for <strong className="text-foreground">{label}</strong>
                {classRow.periodTime ? ` · ${classRow.periodTime}` : ''}
              </p>
              <Link
                href={
                  classRow.id.startsWith('demo-')
                    ? '#'
                    : `/classes/${classRow.id}?tab=lessons`
                }
                className={cn(
                  'inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline',
                  classRow.id.startsWith('demo-') && 'pointer-events-none opacity-50'
                )}
                onClick={(e) => classRow.id.startsWith('demo-') && e.preventDefault()}
              >
                Edit in class
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <div
                className="grid min-w-[820px] gap-0 rounded-lg border border-border bg-card"
                style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}
              >
                {dayPlans.map(({ date, day, plan }) => {
                  const key = `${classRow.id}:${date}`
                  const dayOpen = expandedDayKey === key
                  const isToday = date === isoDate(new Date())
                  const taught = plan?.status === 'taught'

                  return (
                    <div
                      key={date}
                      className={cn(
                        'min-h-[160px] border-r border-border p-2 last:border-r-0',
                        dayOpen && 'bg-muted/40',
                        isToday && !dayOpen && 'bg-primary/5'
                      )}
                    >
                      <div className="mb-1.5 flex items-start justify-between gap-1">
                        <p
                          className={cn(
                            'text-[10px] font-semibold',
                            isToday ? 'text-primary' : 'text-muted-foreground'
                          )}
                        >
                          {formatShortDay(day)}
                        </p>
                        {plan && onToggleTaught ? (
                          <button
                            type="button"
                            title={taught ? 'Mark not done' : 'Mark done'}
                            disabled={pending}
                            className={cn(
                              'rounded p-0.5',
                              taught ? 'text-emerald-600' : 'text-slate-300 hover:text-emerald-600'
                            )}
                            onClick={() => onToggleTaught(classRow.id, plan, !taught)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>

                      {!plan ? (
                        <div className="flex min-h-[100px] flex-col items-center justify-center rounded-md border border-dashed border-border px-1 text-center text-[11px] text-muted-foreground">
                          No plan
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="w-full text-left"
                          aria-expanded={dayOpen}
                          onClick={() => onExpandDay(dayOpen ? null : key)}
                        >
                          <p className="text-[11px] leading-snug">
                            <span className="font-semibold">Topic: </span>
                            <span className={dayOpen ? '' : 'line-clamp-2'}>{topicOf(plan)}</span>
                          </p>
                          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                            <span className="font-semibold text-foreground">Objectives: </span>
                            <span className={dayOpen ? '' : 'line-clamp-2'}>
                              {objectivesPreview(plan)}
                            </span>
                          </p>
                          <div className="mt-1.5 flex justify-center">
                            <ChevronDown
                              className={cn(
                                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                                dayOpen && 'rotate-180 text-primary'
                              )}
                            />
                          </div>
                          {dayOpen ? <FullLessonFields plan={plan} /> : null}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

'use client'

/**
 * Monthly assignment calendar — SchoolWorx style Jen shared:
 * month grid, chips per day (homework/quizzes/tests), overflow "+ more",
 * optional holiday banner strip.
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type CalendarAssignment = {
  id: string
  title: string
  dueDate: string // YYYY-MM-DD
  classId: string
  className: string
  maxPoints?: number
  isExtraCredit?: boolean
}

export type CalendarHoliday = {
  id: string
  label: string
  startDate: string
  endDate: string
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const CHIP_MAX = 4

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 12, 0, 0)
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 12, 0, 0)
}

function isoDate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Monday-first weeks covering the visible month */
function buildMonthCells(month: Date): { date: Date; inMonth: boolean }[] {
  const first = startOfMonth(month)
  // Monday = 0 … Sunday = 6
  const dow = (first.getDay() + 6) % 7
  const gridStart = new Date(first)
  gridStart.setDate(first.getDate() - dow)

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push({
      date: d,
      inMonth: d.getMonth() === month.getMonth(),
    })
  }
  // trim trailing empty week if all out of month
  while (cells.length > 35) {
    const last7 = cells.slice(-7)
    if (last7.every((c) => !c.inMonth)) cells.splice(-7)
    else break
  }
  return cells
}

function chipColor(title: string, className: string): string {
  const t = `${title} ${className}`.toLowerCase()
  if (t.includes('test') || t.includes('quiz') || t.includes('exam')) {
    return 'bg-sky-700 text-white border-sky-800'
  }
  if (t.includes('health') || t.includes('history') || t.includes('science')) {
    return 'bg-teal-600 text-white border-teal-700'
  }
  if (t.includes('math') || t.includes('arithmetic')) {
    return 'bg-indigo-600 text-white border-indigo-700'
  }
  if (t.includes('write') || t.includes('language') || t.includes('spell') || t.includes('read')) {
    return 'bg-sky-600 text-white border-sky-700'
  }
  return 'bg-slate-600 text-white border-slate-700'
}

function holidaysSpanning(
  holidays: CalendarHoliday[],
  dateIso: string
): CalendarHoliday[] {
  return holidays.filter((h) => dateIso >= h.startDate && dateIso <= h.endDate)
}

export function AssignmentMonthCalendar({
  assignments,
  holidays = [],
  title = 'Assignment calendar',
}: {
  assignments: CalendarAssignment[]
  holidays?: CalendarHoliday[]
  title?: string
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({})

  const byDate = useMemo(() => {
    const m = new Map<string, CalendarAssignment[]>()
    for (const a of assignments) {
      if (!a.dueDate) continue
      const list = m.get(a.dueDate) || []
      list.push(a)
      m.set(a.dueDate, list)
    }
    for (const [, list] of m) {
      list.sort((a, b) => a.className.localeCompare(b.className) || a.title.localeCompare(b.title))
    }
    return m
  }, [assignments])

  const cells = useMemo(() => buildMonthCells(cursor), [cursor])
  const monthLabel = cursor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Detect multi-day holiday rows to show banner on first day of span in week
  function holidayBannerForCell(dateIso: string, inMonth: boolean): string | null {
    if (!inMonth) return null
    for (const h of holidays) {
      if (dateIso >= h.startDate && dateIso <= h.endDate) {
        // show label only on first day of holiday or first visible day of week
        if (dateIso === h.startDate) return h.label
        const d = new Date(dateIso + 'T12:00:00')
        if ((d.getDay() + 6) % 7 === 0 && dateIso > h.startDate) return h.label // Monday continue
      }
    }
    return null
  }

  return (
    <div className="space-y-4 animate-beacon-in">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Calendar
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-navy dark:text-sky-50">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-xl">
            Month view of due work — like SchoolWorx. Each chip is an assignment; open a class to
            edit.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-border bg-card p-2 hover:bg-muted"
            aria-label="Previous month"
            onClick={() => setCursor((c) => addMonths(c, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[10rem] text-center text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">
            {monthLabel}
          </span>
          <button
            type="button"
            className="rounded-lg border border-border bg-card p-2 hover:bg-muted"
            aria-label="Next month"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            This month
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-300 shadow-sm dark:border-slate-700">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 bg-slate-700 text-white">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-r border-slate-600 px-2 py-2 text-center text-xs font-bold last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-white dark:bg-slate-950">
          {cells.map(({ date, inMonth }) => {
            const iso = isoDate(date)
            const items = byDate.get(iso) || []
            const expanded = expandedDays[iso]
            const visible = expanded ? items : items.slice(0, CHIP_MAX)
            const overflow = items.length - CHIP_MAX
            const holidayLabel = holidayBannerForCell(iso, inMonth)
            const isHoliday = holidaysSpanning(holidays, iso).length > 0
            const isToday = iso === isoDate(new Date())

            return (
              <div
                key={iso}
                className={cn(
                  'min-h-[110px] border-b border-r border-slate-200 p-1.5 last:border-r-0 dark:border-slate-800 sm:min-h-[128px]',
                  !inMonth && 'bg-slate-50/80 text-slate-400 dark:bg-slate-900/40',
                  isHoliday && inMonth && 'bg-amber-50/40 dark:bg-amber-950/20',
                  isToday && 'ring-2 ring-inset ring-sky-500/50'
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'text-xs font-bold tabular-nums',
                      isToday &&
                        'flex h-6 w-6 items-center justify-center rounded-full bg-sky-600 text-white'
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>

                {holidayLabel && (
                  <div className="mb-1 truncate rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                    Holiday: {holidayLabel}
                  </div>
                )}

                <ul className="space-y-0.5">
                  {visible.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/classes/${a.classId}`}
                        title={`${a.className}: ${a.title}`}
                        className={cn(
                          'block truncate rounded border px-1 py-0.5 text-[10px] font-medium leading-tight shadow-sm transition hover:brightness-110',
                          chipColor(a.title, a.className)
                        )}
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>

                {!expanded && overflow > 0 && (
                  <button
                    type="button"
                    className="mt-0.5 w-full text-left text-[10px] font-semibold text-sky-700 hover:underline dark:text-sky-300"
                    onClick={() => setExpandedDays((s) => ({ ...s, [iso]: true }))}
                  >
                    + more ({overflow})
                  </button>
                )}
                {expanded && items.length > CHIP_MAX && (
                  <button
                    type="button"
                    className="mt-0.5 text-[10px] font-semibold text-muted-foreground hover:underline"
                    onClick={() => setExpandedDays((s) => ({ ...s, [iso]: false }))}
                  >
                    Show less
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Chips use assignment due dates from your classes. Add due dates under Class → setup when
        creating assignments.
      </p>
    </div>
  )
}

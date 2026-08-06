'use client'

/**
 * Monthly assignment calendar — month grid with due-work chips.
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
  while (cells.length > 35) {
    const last7 = cells.slice(-7)
    if (last7.every((c) => !c.inMonth)) cells.splice(-7)
    else break
  }
  return cells
}

function chipClass(title: string): string {
  const t = title.toLowerCase()
  if (t.includes('test') || t.includes('quiz') || t.includes('exam')) {
    return 'border-primary/30 bg-primary text-primary-foreground'
  }
  return 'border-border bg-muted text-foreground'
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

  function holidayBannerForCell(dateIso: string, inMonth: boolean): string | null {
    if (!inMonth) return null
    for (const h of holidays) {
      if (dateIso >= h.startDate && dateIso <= h.endDate) {
        if (dateIso === h.startDate) return h.label
        const d = new Date(dateIso + 'T12:00:00')
        if ((d.getDay() + 6) % 7 === 0 && dateIso > h.startDate) return h.label
      }
    }
    return null
  }

  return (
    <div className="page-stack animate-beacon-in">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/80 pb-3">
        <div>
          <p className="text-[13px] font-medium text-foreground">{title}</p>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Due dates across your classes
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="rounded-md border border-border bg-card p-1.5 hover:bg-muted"
            aria-label="Previous month"
            onClick={() => setCursor((c) => addMonths(c, -1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[9rem] text-center text-[13px] font-medium">{monthLabel}</span>
          <button
            type="button"
            className="rounded-md border border-border bg-card p-1.5 hover:bg-muted"
            aria-label="Next month"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] font-medium"
            onClick={() => setCursor(startOfMonth(new Date()))}
          >
            Today
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <div className="grid grid-cols-7 border-b border-border bg-muted/50">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="border-r border-border px-1 py-1.5 text-center text-[11px] font-medium text-muted-foreground last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 bg-card">
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
                  'min-h-[96px] border-b border-r border-border p-1 last:border-r-0 sm:min-h-[112px]',
                  !inMonth && 'bg-muted/20 text-muted-foreground/60',
                  isHoliday && inMonth && 'bg-warning-soft/30',
                  isToday && 'ring-1 ring-inset ring-primary/40'
                )}
              >
                <div className="mb-1 flex items-center justify-between gap-1">
                  <span
                    className={cn(
                      'text-[11px] font-medium tabular-nums',
                      isToday && 'rounded-md bg-primary px-1.5 py-0.5 text-primary-foreground'
                    )}
                  >
                    {date.getDate()}
                  </span>
                </div>

                {holidayLabel && (
                  <div className="mb-1 truncate rounded border border-warning/30 bg-warning-soft px-1 py-0.5 text-[10px] font-medium text-warning">
                    {holidayLabel}
                  </div>
                )}

                <ul className="space-y-0.5">
                  {visible.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/classes/${a.classId}`}
                        title={`${a.className}: ${a.title}`}
                        className={cn(
                          'block truncate rounded border px-1 py-0.5 text-[10px] font-medium leading-tight hover:opacity-90',
                          chipClass(a.title)
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
                    className="mt-0.5 w-full text-left text-[10px] font-medium text-primary hover:underline"
                    onClick={() => setExpandedDays((s) => ({ ...s, [iso]: true }))}
                  >
                    +{overflow} more
                  </button>
                )}
                {expanded && items.length > CHIP_MAX && (
                  <button
                    type="button"
                    className="mt-0.5 text-[10px] font-medium text-muted-foreground hover:underline"
                    onClick={() => setExpandedDays((s) => ({ ...s, [iso]: false }))}
                  >
                    Less
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Set due dates under Class → Setup when creating assignments.
      </p>
    </div>
  )
}

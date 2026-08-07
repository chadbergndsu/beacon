/** Shared Mon–Fri lesson week date helpers. */

export function startOfWeekMonday(d: Date): Date {
  const x = new Date(d)
  x.setHours(12, 0, 0, 0)
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function formatLongDay(iso: string): string {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShortDay(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export function formatWeekRange(monday: Date): string {
  const fri = addDays(monday, 4)
  const a = monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const b = fri.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${a} – ${b}`
}

export function weekDayDates(monday: Date): Date[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i))
}

export function weekDayIsos(monday: Date): string[] {
  return weekDayDates(monday).map(isoDate)
}

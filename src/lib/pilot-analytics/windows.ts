import type { HelpfulnessMetric, RatioMetric } from './types'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000
const HELPFULNESS_MINIMUM_RESPONSES = 5

function dateKeyFromUtcMilliseconds(milliseconds: number): string {
  return new Date(milliseconds).toISOString().slice(0, 10)
}

function utcMidnightMilliseconds(dateKey: string): number {
  return new Date(`${dateKey}T00:00:00.000Z`).getTime()
}

function assertNonNegative(value: number, name: string): void {
  if (value < 0) {
    throw new Error(`${name} must not be negative`)
  }
}

export function utcDateKey(now: Date): string {
  return dateKeyFromUtcMilliseconds(now.getTime())
}

export function isoWeekStart(now: Date): string {
  const midnight = utcMidnightMilliseconds(utcDateKey(now))
  const day = new Date(midnight).getUTCDay()
  const daysSinceMonday = (day + 6) % 7
  return dateKeyFromUtcMilliseconds(midnight - daysSinceMonday * MILLISECONDS_PER_DAY)
}

export function trailingWindow(now: Date, days: number): { start: string; end: string } {
  const end = utcDateKey(now)
  const endMidnight = utcMidnightMilliseconds(end)

  return {
    start: dateKeyFromUtcMilliseconds(endMidnight - (days - 1) * MILLISECONDS_PER_DAY),
    end,
  }
}

export function isBaselinePeriod(firstActivityDate: string | null, now: Date): boolean {
  if (firstActivityDate === null) {
    return false
  }

  const elapsedDays =
    (utcMidnightMilliseconds(utcDateKey(now)) - utcMidnightMilliseconds(firstActivityDate)) /
    MILLISECONDS_PER_DAY

  return elapsedDays >= 0 && elapsedDays < 28
}

export function baselineDay(firstActivityDate: string | null, now: Date): number | null {
  if (!isBaselinePeriod(firstActivityDate, now) || firstActivityDate === null) {
    return null
  }

  return (
    (utcMidnightMilliseconds(utcDateKey(now)) - utcMidnightMilliseconds(firstActivityDate)) /
      MILLISECONDS_PER_DAY +
    1
  )
}

export function buildRatioMetric(input: {
  active: number | null
  eligible: number | null
}): RatioMetric {
  const { active, eligible } = input

  if (active === null || eligible === null) {
    return { state: 'unavailable', reason: 'Activity or eligibility data is unavailable.' }
  }

  assertNonNegative(active, 'active')
  assertNonNegative(eligible, 'eligible')

  if (eligible === 0) {
    return { state: 'no_eligible', active: 0, eligible: 0 }
  }

  return {
    state: 'ready',
    active,
    eligible,
    percent: Math.round((active / eligible) * 100),
  }
}

export function buildHelpfulnessMetric(input: {
  helpful: number | null
  total: number | null
}): HelpfulnessMetric {
  const { helpful, total } = input

  if (helpful === null || total === null) {
    return { state: 'unavailable', reason: 'Helpfulness data is unavailable.' }
  }

  assertNonNegative(helpful, 'helpful')
  assertNonNegative(total, 'total')

  if (total < HELPFULNESS_MINIMUM_RESPONSES) {
    return {
      state: 'small_sample',
      helpful,
      total,
      minimum: HELPFULNESS_MINIMUM_RESPONSES,
    }
  }

  return {
    state: 'ready',
    helpful,
    total,
    percent: Math.round((helpful / total) * 100),
  }
}

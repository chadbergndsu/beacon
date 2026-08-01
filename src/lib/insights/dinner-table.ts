/**
 * Dinner Table Digest — unique to Beacon.
 *
 * FACTS / Jupiter / PowerSchool / Gradelink show portals of tables.
 * Families need something they can read at the dinner table in 60 seconds:
 * Celebrate · Watch · Grades · Presence · Coming up.
 */

import type { TransparentResult } from '@/lib/types'
import type { PulseEntry } from '@/lib/school-modules/types'
import type { AttendanceRecord } from '@/lib/attendance/types'
import { PULSE_LEVEL_LABEL } from '@/lib/school-modules/types'
import { ATTENDANCE_LABEL } from '@/lib/attendance/types'

export type ClassSnapshot = {
  className: string
  subject?: string | null
  result: TransparentResult
}

export type DinnerTableDigest = {
  studentName: string
  gradeLevel: string | null
  weekLabel: string
  celebrate: string[]
  watch: string[]
  gradesLine: string
  presenceLine: string
  comingUp: string[]
  conversationStarters: string[]
  generatedAt: string
}

function daysAgo(n: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function buildDinnerTableDigest(input: {
  studentName: string
  gradeLevel?: string | null
  classes: ClassSnapshot[]
  pulses: PulseEntry[]
  attendance: AttendanceRecord[]
  now?: Date
}): DinnerTableDigest {
  const now = input.now ?? new Date()
  const weekStart = daysAgo(7)
  const weekLabel = `Week of ${weekStart.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`

  const celebrate: string[] = []
  const watch: string[] = []
  const comingUp: string[] = []

  // Pulse celebrates + care signals (last 14 days)
  const recentPulses = input.pulses.filter((p) => {
    const t = new Date(p.createdAt || `${p.date}T12:00:00`)
    return t >= daysAgo(14)
  })

  for (const p of recentPulses) {
    if (p.celebrate?.trim()) {
      celebrate.push(p.celebrate.trim())
    }
    if (p.overall === 'strong' && !p.celebrate) {
      celebrate.push(`${PULSE_LEVEL_LABEL.strong} classroom pulse from ${p.teacherName || 'teacher'}`)
    }
    if (p.overall === 'needs_care') {
      watch.push(
        p.note?.trim()
          ? `Needs care: ${p.note.trim().slice(0, 120)}`
          : `A teacher marked needs care on ${p.date} — ask how the day felt.`
      )
    }
  }

  // Class grade snapshots
  const graded = input.classes.filter((c) => c.result.overall != null)
  const strongClasses = graded
    .filter((c) => (c.result.overall ?? 0) >= 90)
    .sort((a, b) => (b.result.overall ?? 0) - (a.result.overall ?? 0))
  const softClasses = graded
    .filter((c) => (c.result.overall ?? 100) < 75)
    .sort((a, b) => (a.result.overall ?? 0) - (b.result.overall ?? 0))

  for (const c of strongClasses.slice(0, 2)) {
    celebrate.push(
      `${c.className} is at ${c.result.overall?.toFixed(0)}% (${c.result.letter}) — worth a high-five.`
    )
  }
  for (const c of softClasses.slice(0, 2)) {
    watch.push(
      `${c.className} is at ${c.result.overall?.toFixed(0)}% (${c.result.letter})${
        c.result.missingCount ? ` · ${c.result.missingCount} missing` : ''
      }.`
    )
  }

  let missingTotal = 0
  for (const c of input.classes) {
    missingTotal += c.result.missingCount || 0
    if (c.result.missingCount > 0) {
      comingUp.push(`Turn in ${c.result.missingCount} missing item(s) in ${c.className}.`)
    }
  }
  if (missingTotal === 0 && graded.length) {
    comingUp.push('No missing work right now — keep the rhythm.')
  }

  const gradesLine =
    graded.length === 0
      ? 'No posted class averages yet this term.'
      : graded
          .map((c) => `${c.className}: ${c.result.overall?.toFixed(0)}% ${c.result.letter ?? ''}`)
          .join(' · ')

  // Attendance last 14 days
  const recentAtt = input.attendance.filter((a) => a.date >= isoDate(daysAgo(14)))
  const absents = recentAtt.filter((a) => a.status === 'absent' || a.status === 'excused')
  const tardies = recentAtt.filter((a) => a.status === 'tardy')
  let presenceLine = 'Present and accounted for the last two weeks.'
  if (absents.length || tardies.length) {
    const bits: string[] = []
    if (absents.length) {
      bits.push(
        `${absents.length} absence(s): ${absents
          .slice(0, 3)
          .map((a) => `${a.date} (${ATTENDANCE_LABEL[a.status]})`)
          .join(', ')}`
      )
    }
    if (tardies.length) bits.push(`${tardies.length} tardy day(s)`)
    presenceLine = bits.join(' · ')
    if (absents.length >= 2) {
      watch.push('Attendance has a few gaps — a quick check-in with the office helps.')
    }
  }

  // Conversation starters (the product moat — dinner, not dashboard)
  const conversationStarters: string[] = []
  if (celebrate[0]) {
    conversationStarters.push(`What felt good about ${celebrate[0].split('—')[0].trim()}?`)
  }
  if (softClasses[0]) {
    conversationStarters.push(
      `What's the hardest part of ${softClasses[0].className} right now?`
    )
  }
  const joyPulse = recentPulses.find((p) => p.dimensions?.joy === 'strong' || p.dimensions?.joy === 'needs_care')
  if (joyPulse?.dimensions?.joy === 'needs_care') {
    conversationStarters.push('Who did you sit with at lunch this week?')
  } else {
    conversationStarters.push('What are you looking forward to at school this week?')
  }
  if (conversationStarters.length < 3) {
    conversationStarters.push('Is there a teacher or classmate you want to thank?')
  }

  // Dedupe + cap
  const uniq = (arr: string[]) => [...new Set(arr.map((s) => s.trim()).filter(Boolean))]

  return {
    studentName: input.studentName,
    gradeLevel: input.gradeLevel ?? null,
    weekLabel,
    celebrate: uniq(celebrate).slice(0, 4),
    watch: uniq(watch).slice(0, 4),
    gradesLine,
    presenceLine,
    comingUp: uniq(comingUp).slice(0, 4),
    conversationStarters: uniq(conversationStarters).slice(0, 3),
    generatedAt: now.toISOString(),
  }
}

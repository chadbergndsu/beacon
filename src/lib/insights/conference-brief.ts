/**
 * Conference Brief — unique to Beacon.
 *
 * Parent-teacher conferences usually mean 20 minutes of tab-switching in
 * FACTS / Jupiter. Beacon packages grades + pulse + attendance into a
 * one-page talking sheet either side can print in 10 seconds.
 */

import type { TransparentResult } from '@/lib/types'
import type { PulseEntry } from '@/lib/school-modules/types'
import type { AttendanceRecord } from '@/lib/attendance/types'
import { PULSE_LABELS, PULSE_LEVEL_LABEL } from '@/lib/school-modules/types'
import { ATTENDANCE_LABEL } from '@/lib/attendance/types'

export type ConferenceClassRow = {
  className: string
  subject?: string | null
  teacherName?: string | null
  result: TransparentResult
}

export type ConferenceBrief = {
  studentName: string
  gradeLevel: string | null
  preparedFor: string
  classes: {
    name: string
    subject: string | null
    overall: number | null
    letter: string | null
    missing: number
    formula: string
    highlights: string[]
  }[]
  pulseSummary: {
    latestOverall: string | null
    latestDate: string | null
    celebrate: string[]
    careNotes: string[]
    dimensionTrends: string[]
  }
  attendanceSummary: {
    presentDays: number
    absentDays: number
    tardyDays: number
    recentNotes: string[]
  }
  talkingPoints: string[]
  familyWins: string[]
  nextSteps: string[]
  generatedAt: string
}

export function buildConferenceBrief(input: {
  studentName: string
  gradeLevel?: string | null
  preparedFor?: string
  classes: ConferenceClassRow[]
  pulses: PulseEntry[]
  attendance: AttendanceRecord[]
  now?: Date
}): ConferenceBrief {
  const now = input.now ?? new Date()

  const classes = input.classes.map((c) => {
    const highlights: string[] = []
    for (const b of c.result.breakdown) {
      if (b.average != null && b.average >= 92) {
        highlights.push(`Strong in ${b.name} (${b.average.toFixed(0)}%)`)
      } else if (b.average != null && b.average < 70) {
        highlights.push(`${b.name} needs support (${b.average.toFixed(0)}%)`)
      }
    }
    if (c.result.missingCount > 0) {
      highlights.push(`${c.result.missingCount} missing assignment(s)`)
    }
    return {
      name: c.className,
      subject: c.subject ?? null,
      overall: c.result.overall,
      letter: c.result.letter,
      missing: c.result.missingCount,
      formula: c.result.formula,
      highlights: highlights.slice(0, 3),
    }
  })

  const sortedPulses = [...input.pulses].sort((a, b) =>
    (b.createdAt || b.date).localeCompare(a.createdAt || a.date)
  )
  const latest = sortedPulses[0]
  const celebrate = sortedPulses
    .map((p) => p.celebrate?.trim())
    .filter((s): s is string => Boolean(s))
    .slice(0, 4)
  const careNotes = sortedPulses
    .filter((p) => p.overall === 'needs_care' || p.note?.trim())
    .slice(0, 5)
    .map((p) => {
      const head = `${p.date} · ${PULSE_LEVEL_LABEL[p.overall]}`
      return p.note?.trim() ? `${head}: ${p.note.trim()}` : head
    })

  // Dimension frequency
  const dimCounts: Record<string, { strong: number; care: number }> = {}
  for (const p of sortedPulses.slice(0, 12)) {
    for (const [dim, level] of Object.entries(p.dimensions || {})) {
      if (!dimCounts[dim]) dimCounts[dim] = { strong: 0, care: 0 }
      if (level === 'strong') dimCounts[dim].strong++
      if (level === 'needs_care') dimCounts[dim].care++
    }
  }
  const dimensionTrends = Object.entries(dimCounts)
    .map(([dim, c]) => {
      const label = PULSE_LABELS[dim as keyof typeof PULSE_LABELS] || dim
      if (c.care >= 2) return `${label}: repeated needs-care signals`
      if (c.strong >= 2) return `${label}: consistent strength`
      return null
    })
    .filter((s): s is string => Boolean(s))
    .slice(0, 5)

  const att = input.attendance
  const attendanceSummary = {
    presentDays: att.filter((a) => a.status === 'present').length,
    absentDays: att.filter((a) => a.status === 'absent' || a.status === 'excused').length,
    tardyDays: att.filter((a) => a.status === 'tardy').length,
    recentNotes: att
      .filter((a) => a.status !== 'present')
      .slice(0, 6)
      .map((a) => `${a.date}: ${ATTENDANCE_LABEL[a.status]}${a.note ? ` — ${a.note}` : ''}`),
  }

  const talkingPoints: string[] = []
  const familyWins: string[] = [...celebrate]
  const nextSteps: string[] = []

  for (const c of classes) {
    if (c.overall != null && c.overall >= 90) {
      familyWins.push(`${c.name} at ${c.overall.toFixed(0)}% (${c.letter})`)
      talkingPoints.push(`Affirm excellence in ${c.name}.`)
    }
    if (c.overall != null && c.overall < 75) {
      talkingPoints.push(`Partner on a plan for ${c.name} (currently ${c.overall.toFixed(0)}%).`)
      nextSteps.push(`Set a 2-week check-in goal for ${c.name}.`)
    }
    if (c.missing > 0) {
      nextSteps.push(`Clear ${c.missing} missing item(s) in ${c.name} this week.`)
    }
  }

  if (latest?.overall === 'needs_care') {
    talkingPoints.push('Discuss whole-child needs beyond academics (Beacon Pulse).')
  }
  if (attendanceSummary.absentDays >= 3) {
    talkingPoints.push('Review attendance pattern and any support the family needs.')
    nextSteps.push('Agree on an attendance plan with the office if absences continue.')
  }
  if (talkingPoints.length === 0) {
    talkingPoints.push('Review strengths and keep momentum — no major academic flags.')
  }
  if (nextSteps.length === 0) {
    nextSteps.push('Keep current routines; celebrate consistency at home.')
  }

  return {
    studentName: input.studentName,
    gradeLevel: input.gradeLevel ?? null,
    preparedFor: input.preparedFor || 'Parent–Teacher Conference',
    classes,
    pulseSummary: {
      latestOverall: latest ? PULSE_LEVEL_LABEL[latest.overall] : null,
      latestDate: latest?.date ?? null,
      celebrate,
      careNotes,
      dimensionTrends,
    },
    attendanceSummary,
    talkingPoints: [...new Set(talkingPoints)].slice(0, 6),
    familyWins: [...new Set(familyWins)].slice(0, 5),
    nextSteps: [...new Set(nextSteps)].slice(0, 5),
    generatedAt: now.toISOString(),
  }
}

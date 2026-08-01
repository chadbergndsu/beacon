/**
 * Beacon Signal — unique to Beacon.
 *
 * Enterprise SIS tools bury climate in 40-column analytics.
 * Small Christian academies need one honest "heart rate" for the building:
 * pulse care load + attendance friction + missing-work pressure.
 */

import type { PulseEntry } from '@/lib/school-modules/types'
import type { AttendanceRecord } from '@/lib/attendance/types'

export type SignalLevel = 'thriving' | 'steady' | 'watch' | 'urgent'

export type StudentSignal = {
  studentId: string
  studentName: string
  gradeLevel: string | null
  reason: string
  score: number // 0–100, lower = more concern
}

export type BeaconSignal = {
  level: SignalLevel
  score: number // 0–100, higher = healthier school climate
  headline: string
  summary: string
  metrics: {
    pulseCareCount: number
    pulseStrongCount: number
    recentAbsences: number
    recentTardies: number
    studentsWithMissingWork: number
    studentsObserved: number
  }
  watchList: StudentSignal[]
  wins: string[]
  generatedAt: string
}

function levelFromScore(score: number): SignalLevel {
  if (score >= 85) return 'thriving'
  if (score >= 70) return 'steady'
  if (score >= 50) return 'watch'
  return 'urgent'
}

const HEADLINES: Record<SignalLevel, string> = {
  thriving: 'The building feels healthy',
  steady: 'Solid — a few students need eyes',
  watch: 'Climate needs pastoral attention',
  urgent: 'Several signals need same-day follow-up',
}

export function buildBeaconSignal(input: {
  studentCount: number
  pulses: PulseEntry[]
  attendance: AttendanceRecord[]
  /** studentId → missing assignment count (across classes) */
  missingByStudent: Map<string, number>
  /** studentId → display name */
  studentNames: Map<string, { name: string; gradeLevel: string | null }>
  now?: Date
}): BeaconSignal {
  const now = input.now ?? new Date()
  const since = new Date(now)
  since.setDate(since.getDate() - 14)

  const recentPulses = input.pulses.filter((p) => {
    const t = new Date(p.createdAt || `${p.date}T12:00:00`)
    return t >= since
  })
  const pulseCareCount = recentPulses.filter((p) => p.overall === 'needs_care').length
  const pulseStrongCount = recentPulses.filter((p) => p.overall === 'strong').length

  const recentAtt = input.attendance.filter((a) => {
    const t = new Date(`${a.date}T12:00:00`)
    return t >= since
  })
  const recentAbsences = recentAtt.filter(
    (a) => a.status === 'absent' || a.status === 'excused'
  ).length
  const recentTardies = recentAtt.filter((a) => a.status === 'tardy').length

  let studentsWithMissingWork = 0
  for (const n of input.missingByStudent.values()) {
    if (n > 0) studentsWithMissingWork++
  }

  const n = Math.max(input.studentCount, 1)

  // Weighted climate score — starts at 100, subtract friction
  let score = 100
  score -= Math.min(35, (pulseCareCount / n) * 120)
  score -= Math.min(25, (recentAbsences / n) * 40)
  score -= Math.min(15, (recentTardies / n) * 25)
  score -= Math.min(25, (studentsWithMissingWork / n) * 50)
  score += Math.min(10, (pulseStrongCount / n) * 20)
  score = Math.round(Math.max(0, Math.min(100, score)))

  const level = levelFromScore(score)

  // Per-student concern ranking
  const concern = new Map<string, { score: number; reasons: string[] }>()
  const bump = (id: string, delta: number, reason: string) => {
    const cur = concern.get(id) || { score: 100, reasons: [] as string[] }
    cur.score -= delta
    if (!cur.reasons.includes(reason)) cur.reasons.push(reason)
    concern.set(id, cur)
  }

  for (const p of recentPulses) {
    if (p.overall === 'needs_care') {
      bump(p.studentId, 25, p.note?.trim() || 'Pulse: needs care')
    }
  }
  const absByStudent = new Map<string, number>()
  for (const a of recentAtt) {
    if (a.status === 'absent' || a.status === 'excused') {
      absByStudent.set(a.studentId, (absByStudent.get(a.studentId) || 0) + 1)
    }
  }
  for (const [id, count] of absByStudent) {
    if (count >= 2) bump(id, 10 * count, `${count} absences in 14 days`)
  }
  for (const [id, missing] of input.missingByStudent) {
    if (missing >= 2) bump(id, Math.min(30, missing * 8), `${missing} missing assignments`)
  }

  const watchList: StudentSignal[] = [...concern.entries()]
    .map(([studentId, v]) => {
      const meta = input.studentNames.get(studentId)
      return {
        studentId,
        studentName: meta?.name || 'Student',
        gradeLevel: meta?.gradeLevel ?? null,
        reason: v.reasons.slice(0, 2).join(' · '),
        score: Math.max(0, v.score),
      }
    })
    .filter((s) => s.score < 80)
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)

  const wins: string[] = []
  if (pulseStrongCount > 0) {
    wins.push(`${pulseStrongCount} strong pulse check-ins in the last two weeks`)
  }
  if (studentsWithMissingWork === 0 && input.studentCount > 0) {
    wins.push('No students with outstanding missing work')
  }
  if (recentAbsences === 0 && input.studentCount > 0) {
    wins.push('Clean attendance the last two weeks')
  }
  if (wins.length === 0) {
    wins.push('Keep logging Beacon Pulse — the signal gets sharper with more teacher input')
  }

  const summary = [
    `${pulseCareCount} needs-care pulse(s)`,
    `${recentAbsences} absence(s)`,
    `${studentsWithMissingWork} student(s) with missing work`,
  ].join(' · ')

  return {
    level,
    score,
    headline: HEADLINES[level],
    summary,
    metrics: {
      pulseCareCount,
      pulseStrongCount,
      recentAbsences,
      recentTardies,
      studentsWithMissingWork,
      studentsObserved: new Set(recentPulses.map((p) => p.studentId)).size,
    },
    watchList,
    wins,
    generatedAt: now.toISOString(),
  }
}

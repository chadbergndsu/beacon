/**
 * Missing Work Radar
 *
 * Market context (Gradelink, FACTS, PowerSchool parent portals):
 * families churn when "missing work" is buried. Competitors push real-time
 * alerts; Beacon surfaces a calm, scannable list next to Dinner Table Digest.
 *
 * Senior rule: future-due assignments without scores are "upcoming", not missing.
 */

import type { Assignment, Grade } from '@/lib/types'

export type MissingWorkItem = {
  assignmentId: string
  title: string
  classId: string
  className: string
  dueDate: string | null
  maxPoints: number
  status: 'missing' | 'upcoming'
}

export type MissingWorkSummary = {
  studentId: string
  studentName: string
  missing: MissingWorkItem[]
  upcoming: MissingWorkItem[]
  missingCount: number
  upcomingCount: number
}

function todayIso(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}

export function classifyStudentWork(input: {
  studentId: string
  studentName: string
  classes: {
    classId: string
    className: string
    assignments: Assignment[]
    grades: Grade[]
  }[]
  now?: Date
}): MissingWorkSummary {
  const today = todayIso(input.now)
  const gradeByAssignment = new Map<string, Grade>()
  for (const c of input.classes) {
    for (const g of c.grades) {
      if (g.student_id === input.studentId) {
        gradeByAssignment.set(g.assignment_id, g)
      }
    }
  }

  const missing: MissingWorkItem[] = []
  const upcoming: MissingWorkItem[] = []

  for (const c of input.classes) {
    for (const a of c.assignments) {
      const g = gradeByAssignment.get(a.id)
      const hasScore = g && !g.is_missing && g.score != null
      if (hasScore) continue

      const due = a.due_date ? String(a.due_date).slice(0, 10) : null
      const item: MissingWorkItem = {
        assignmentId: a.id,
        title: a.title,
        classId: c.classId,
        className: c.className,
        dueDate: due,
        maxPoints: Number(a.max_points) || 100,
        status: 'missing',
      }

      // Future due → upcoming (not yet late)
      if (due && due > today) {
        item.status = 'upcoming'
        upcoming.push(item)
      } else {
        // No due date or due today/past → missing pressure
        missing.push(item)
      }
    }
  }

  // Soonest due first for upcoming; oldest due first for missing
  missing.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
  upcoming.sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))

  return {
    studentId: input.studentId,
    studentName: input.studentName,
    missing,
    upcoming,
    missingCount: missing.length,
    upcomingCount: upcoming.length,
  }
}

/** Class-level rollup for teachers (who still owes work). */
export type ClassMissingRollup = {
  classId: string
  className: string
  studentCount: number
  studentsWithMissing: number
  totalMissingItems: number
  topStudents: { studentId: string; studentName: string; count: number }[]
}

export function rollupClassMissing(
  classId: string,
  className: string,
  students: { id: string; name: string }[],
  assignments: Assignment[],
  grades: Grade[],
  now?: Date
): ClassMissingRollup {
  const summaries = students.map((s) =>
    classifyStudentWork({
      studentId: s.id,
      studentName: s.name,
      classes: [{ classId, className, assignments, grades }],
      now,
    })
  )

  const withMissing = summaries
    .filter((s) => s.missingCount > 0)
    .map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      count: s.missingCount,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    classId,
    className,
    studentCount: students.length,
    studentsWithMissing: withMissing.length,
    totalMissingItems: withMissing.reduce((n, s) => n + s.count, 0),
    topStudents: withMissing.slice(0, 5),
  }
}

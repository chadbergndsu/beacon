/**
 * Who may email Dinner Table Digest for a student (pure ACL).
 * Leadership: school-wide (caller still enforces school_id).
 * Teachers: only students enrolled in their classes (caller loads enrollment).
 */
import type { Role } from '@/lib/types'
import { isLeadership } from '@/lib/roles'

export function mayEmailStudentDinnerDigest(opts: {
  role: Role | null | undefined
  /** Teacher has this student on a class roster they teach */
  teacherOwnsStudent: boolean
}): boolean {
  if (!opts.role) return false
  if (isLeadership(opts.role)) return true
  if (opts.role === 'teacher') return opts.teacherOwnsStudent
  return false
}

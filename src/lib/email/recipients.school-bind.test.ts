/**
 * Documents the class→school binding contract used by resolveAnnouncementRecipients.
 * Full DB path is covered in app code; this pure helper mirrors the early-exit rule.
 */
import { describe, expect, it } from 'vitest'

function resolveClassStudentIds(opts: {
  classId: string | null | undefined
  classBelongsToSchool: boolean
  enrollments: string[]
}): string[] {
  if (!opts.classId) return []
  if (!opts.classBelongsToSchool) return []
  return opts.enrollments
}

describe('announcement class school bind (contract)', () => {
  it('returns no students when class is foreign to school', () => {
    expect(
      resolveClassStudentIds({
        classId: 'class-b',
        classBelongsToSchool: false,
        enrollments: ['s1', 's2'],
      })
    ).toEqual([])
  })

  it('returns roster when class belongs to school', () => {
    expect(
      resolveClassStudentIds({
        classId: 'class-a',
        classBelongsToSchool: true,
        enrollments: ['s1', 's2'],
      })
    ).toEqual(['s1', 's2'])
  })
})

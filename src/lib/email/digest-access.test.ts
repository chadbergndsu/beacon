import { describe, expect, it } from 'vitest'
import { mayEmailStudentDinnerDigest } from './digest-access'

describe('mayEmailStudentDinnerDigest', () => {
  it('allows leadership regardless of roster', () => {
    expect(
      mayEmailStudentDinnerDigest({ role: 'principal', teacherOwnsStudent: false })
    ).toBe(true)
    expect(
      mayEmailStudentDinnerDigest({ role: 'admin', teacherOwnsStudent: false })
    ).toBe(true)
    expect(
      mayEmailStudentDinnerDigest({ role: 'staff', teacherOwnsStudent: false })
    ).toBe(true)
  })

  it('allows teacher only when they own the student', () => {
    expect(
      mayEmailStudentDinnerDigest({ role: 'teacher', teacherOwnsStudent: true })
    ).toBe(true)
    expect(
      mayEmailStudentDinnerDigest({ role: 'teacher', teacherOwnsStudent: false })
    ).toBe(false)
  })

  it('denies parent and null', () => {
    expect(
      mayEmailStudentDinnerDigest({ role: 'parent', teacherOwnsStudent: true })
    ).toBe(false)
    expect(
      mayEmailStudentDinnerDigest({ role: null, teacherOwnsStudent: true })
    ).toBe(false)
  })
})

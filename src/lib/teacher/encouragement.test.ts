import { describe, expect, it } from 'vitest'
import {
  TEACHER_ENCOURAGEMENTS,
  randomTeacherEncouragement,
  teacherEncouragementAt,
  teacherEncouragementForDay,
} from './encouragement'

describe('teacherEncouragementForDay', () => {
  it('returns a library item with stable index for the same user and day', () => {
    const a = teacherEncouragementForDay('user-1', new Date('2026-08-07T08:00:00Z'))
    const b = teacherEncouragementForDay('user-1', new Date('2026-08-07T22:00:00Z'))
    expect(TEACHER_ENCOURAGEMENTS).toContainEqual(a.item)
    expect(a.index).toBe(b.index)
    expect(a.item).toEqual(b.item)
  })

  it('returns valid items for different users', () => {
    const a = teacherEncouragementForDay('user-a', new Date('2026-08-07T12:00:00Z'))
    const b = teacherEncouragementForDay('user-b', new Date('2026-08-07T12:00:00Z'))
    expect(TEACHER_ENCOURAGEMENTS).toContainEqual(a.item)
    expect(TEACHER_ENCOURAGEMENTS).toContainEqual(b.item)
  })
})

describe('randomTeacherEncouragement', () => {
  it('avoids repeating the excluded index when possible', () => {
    for (let i = 0; i < 20; i++) {
      const next = randomTeacherEncouragement(3)
      expect(next.index).not.toBe(3)
    }
  })

  it('wraps indices safely', () => {
    expect(teacherEncouragementAt(-1).text).toBe(
      TEACHER_ENCOURAGEMENTS[TEACHER_ENCOURAGEMENTS.length - 1]!.text
    )
  })
})

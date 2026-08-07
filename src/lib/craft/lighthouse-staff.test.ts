import { describe, expect, it } from 'vitest'
import {
  LIGHTHOUSE_ENROLLMENT_BY_ROOM,
  LIGHTHOUSE_ENROLLMENT_TOTAL,
  LIGHTHOUSE_STAFF,
  enrollmentTotal,
  lighthouseEnrollmentByRoom,
} from './lighthouse-staff'

describe('Lighthouse staff + enrollment', () => {
  it('totals ~110 kids with heavier lower grades', () => {
    expect(enrollmentTotal(LIGHTHOUSE_ENROLLMENT_BY_ROOM)).toBe(LIGHTHOUSE_ENROLLMENT_TOTAL)
    expect(LIGHTHOUSE_ENROLLMENT_TOTAL).toBe(110)
    const lower =
      (LIGHTHOUSE_ENROLLMENT_BY_ROOM['craft-demo-room-101'] ?? 0) +
      (LIGHTHOUSE_ENROLLMENT_BY_ROOM['craft-demo-room-102'] ?? 0) +
      (LIGHTHOUSE_ENROLLMENT_BY_ROOM['craft-demo-room-103'] ?? 0)
    const upper =
      (LIGHTHOUSE_ENROLLMENT_BY_ROOM['craft-demo-room-201'] ?? 0) +
      (LIGHTHOUSE_ENROLLMENT_BY_ROOM['craft-demo-room-202'] ?? 0) +
      (LIGHTHOUSE_ENROLLMENT_BY_ROOM['craft-demo-room-203'] ?? 0)
    expect(lower).toBeGreaterThan(upper)
  })

  it('names real staff and keeps Jen blond / Chris big', () => {
    expect(LIGHTHOUSE_STAFF.map((s) => s.name)).toEqual(
      expect.arrayContaining([
        'Leigh Evans',
        'Debbie',
        'Jen Berg',
        'John Lynn',
        'Lexie Lynn',
        'Frank',
        'Marian',
        'Chris Cowan',
      ])
    )
    const jen = LIGHTHOUSE_STAFF.find((s) => s.staffId === 'jen-berg')
    expect(jen?.look.hair).toBe('#f5d76e')
    const chris = LIGHTHOUSE_STAFF.find((s) => s.staffId === 'chris-cowan')
    expect(chris?.look.scale).toBeGreaterThan(1.2)
    expect(chris?.title).toMatch(/principal/i)
  })

  it('lets DB enrollment override demo room counts', () => {
    const merged = lighthouseEnrollmentByRoom({ 'craft-demo-room-101': 30 })
    expect(merged['craft-demo-room-101']).toBe(30)
    expect(merged['craft-demo-room-102']).toBe(26)
  })
})

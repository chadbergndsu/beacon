import { describe, expect, it } from 'vitest'
import {
  filterPresenceForViewer,
  canUseFlyMode,
  matchMarkerByName,
  pickTeacherFocusRoom,
  staffMarkersForLayout,
  mergePresenceWithStaff,
  FAKE_DEMO_STUDENTS,
} from './presence'
import { DEMO_SCHOOL_LAYOUT } from './layout'
import type { CraftPresenceRecord } from './types'

const records: CraftPresenceRecord[] = [
  {
    studentId: 'stu-a',
    studentName: 'Alex Rivera',
    roomId: 'craft-demo-room-101',
    since: '2026-08-07T12:00:00.000Z',
    source: 'mock',
  },
  {
    studentId: 'stu-b',
    studentName: 'Blake Chen',
    roomId: 'craft-demo-room-103',
    since: '2026-08-07T12:01:00.000Z',
    source: 'mock',
  },
]

describe('filterPresenceForViewer', () => {
  it('anonymizes minors for admin on the twin', () => {
    const markers = filterPresenceForViewer(records, {
      role: 'admin',
      teacherRoomIds: [],
      parentStudentIds: [],
      anonymizeOthers: false,
    })
    expect(markers).toHaveLength(2)
    expect(markers.every((m) => m.label === 'Student' && m.anonymized)).toBe(true)
    expect(markers.every((m) => m.kind === 'student')).toBe(true)
  })

  it('anonymizes students in a teacher’s rooms (ids kept)', () => {
    const markers = filterPresenceForViewer(records, {
      role: 'teacher',
      teacherRoomIds: ['craft-demo-room-101'],
      parentStudentIds: [],
      anonymizeOthers: false,
    })
    expect(markers).toHaveLength(1)
    expect(markers[0]?.id).toBe('stu-a')
    expect(markers[0]?.label).toBe('Student')
    expect(markers[0]?.anonymized).toBe(true)
  })

  it('shows only linked children with real names for parents', () => {
    const markers = filterPresenceForViewer(records, {
      role: 'parent',
      teacherRoomIds: [],
      parentStudentIds: ['stu-a'],
      anonymizeOthers: true,
    })
    expect(markers).toHaveLength(1)
    expect(markers[0]?.label).toBe('Alex Rivera')
    expect(markers[0]?.anonymized).toBe(false)
  })

  it('hides non-linked students for parents (no Guest labels)', () => {
    const markers = filterPresenceForViewer(records, {
      role: 'parent',
      teacherRoomIds: [],
      parentStudentIds: ['stu-a'],
      anonymizeOthers: false,
    })
    expect(markers).toHaveLength(1)
    expect(markers[0]?.id).toBe('stu-a')
  })
})

describe('staffMarkersForLayout', () => {
  it('places Lighthouse staff with real names', () => {
    const staff = staffMarkersForLayout(DEMO_SCHOOL_LAYOUT)
    expect(staff.some((m) => m.label === 'Leigh Evans')).toBe(true)
    expect(staff.some((m) => m.label === 'Jen Berg')).toBe(true)
    expect(staff.some((m) => m.label === 'Chris Cowan')).toBe(true)
    expect(staff.some((m) => m.label === 'Marian')).toBe(true)
    expect(staff.some((m) => m.label === 'Will Gordon')).toBe(true)
    const jen = staff.find((m) => m.label === 'Jen Berg')
    expect(jen?.look?.hair).toBe('#f5d76e')
    const chris = staff.find((m) => m.label === 'Chris Cowan')
    expect(chris?.look?.scale).toBeGreaterThan(1.2)
  })

  it('prefers DB teacher name overrides when provided', () => {
    const staff = staffMarkersForLayout(DEMO_SCHOOL_LAYOUT, {
      'craft-demo-room-101': 'Ms. Real Teacher',
    })
    const room101 = staff.find((m) => m.roomId.includes('101'))
    expect(room101?.label).toBe('Ms. Real Teacher')
    expect(staff.every((m) => m.kind === 'teacher')).toBe(true)
  })
})

describe('mergePresenceWithStaff', () => {
  it('keeps anonymized students and adds teachers', () => {
    const students = filterPresenceForViewer(records, {
      role: 'admin',
      teacherRoomIds: [],
      parentStudentIds: [],
      anonymizeOthers: false,
    })
    const merged = mergePresenceWithStaff(students, DEMO_SCHOOL_LAYOUT, {
      'craft-demo-room-101': 'Ms. Real Teacher',
    })
    expect(merged.filter((m) => m.kind === 'student')).toHaveLength(2)
    expect(merged.filter((m) => m.kind === 'teacher').length).toBeGreaterThan(0)
    expect(merged.some((m) => m.label === 'Ms. Real Teacher')).toBe(true)
  })
})

describe('FAKE_DEMO_STUDENTS', () => {
  it('only ships fictional demo minors', () => {
    expect(FAKE_DEMO_STUDENTS.every((s) => s.id.startsWith('demo-stu-'))).toBe(true)
    expect(FAKE_DEMO_STUDENTS.some((s) => /berg/i.test(s.name))).toBe(false)
  })
})

describe('canUseFlyMode', () => {
  it('allows leadership roles', () => {
    expect(canUseFlyMode('principal')).toBe(true)
    expect(canUseFlyMode('teacher')).toBe(false)
  })
})

describe('pickTeacherFocusRoom', () => {
  it('prefers a layout room from teacher assignments', () => {
    expect(
      pickTeacherFocusRoom(['craft-demo-room-101'], ['craft-demo-room-101', 'craft-demo-room-102'])
    ).toBe('craft-demo-room-101')
  })
})

describe('matchMarkerByName', () => {
  const parentMarkers = filterPresenceForViewer(records, {
    role: 'parent',
    teacherRoomIds: [],
    parentStudentIds: ['stu-a', 'stu-b'],
    anonymizeOthers: true,
  })
  const staff = staffMarkersForLayout(DEMO_SCHOOL_LAYOUT)

  it('matches full and partial names case-insensitively', () => {
    expect(matchMarkerByName(parentMarkers, 'easton berg')).toBeUndefined()
    expect(matchMarkerByName(parentMarkers, 'alex rivera')?.id).toBe('stu-a')
    expect(matchMarkerByName(parentMarkers, 'berg')).toBeUndefined()
    expect(matchMarkerByName(parentMarkers, 'alex')?.id).toBe('stu-a')
    expect(matchMarkerByName(parentMarkers, 'Blake Chen')?.id).toBe('stu-b')
    expect(matchMarkerByName(staff, 'jen berg')?.label).toBe('Jen Berg')
  })
})

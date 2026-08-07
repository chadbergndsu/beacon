import { describe, expect, it } from 'vitest'
import {
  filterPresenceForViewer,
  canUseFlyMode,
  pickTeacherFocusRoom,
  staffMarkersForLayout,
  mergePresenceWithStaff,
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
  it('shows all named markers for admin', () => {
    const markers = filterPresenceForViewer(records, {
      role: 'admin',
      teacherRoomIds: [],
      parentStudentIds: [],
      anonymizeOthers: false,
    })
    expect(markers).toHaveLength(2)
    expect(markers.map((m) => m.label).sort()).toEqual(['Alex Rivera', 'Blake Chen'])
    expect(markers.every((m) => m.kind === 'student')).toBe(true)
  })

  it('limits teacher to assigned rooms', () => {
    const markers = filterPresenceForViewer(records, {
      role: 'teacher',
      teacherRoomIds: ['craft-demo-room-101'],
      parentStudentIds: [],
      anonymizeOthers: false,
    })
    expect(markers).toHaveLength(1)
    expect(markers[0]?.label).toBe('Alex Rivera')
  })

  it('shows linked child for parent and anonymizes others by default', () => {
    const markers = filterPresenceForViewer(records, {
      role: 'parent',
      teacherRoomIds: [],
      parentStudentIds: ['stu-a'],
      anonymizeOthers: true,
    })
    expect(markers).toHaveLength(2)
    const alex = markers.find((m) => m.id === 'stu-a')
    const other = markers.find((m) => m.id === 'stu-b')
    expect(alex?.anonymized).toBe(false)
    expect(other?.label).toBe('Guest')
    expect(other?.anonymized).toBe(true)
  })

  it('hides non-linked students for parent when anonymize is off', () => {
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
  it('places a teacher in each classroom, office, and gym', () => {
    const staff = staffMarkersForLayout(DEMO_SCHOOL_LAYOUT)
    expect(staff.length).toBeGreaterThanOrEqual(6)
    expect(staff.every((m) => m.kind === 'teacher')).toBe(true)
    expect(staff.some((m) => m.roomId.includes('101'))).toBe(true)
    expect(staff.some((m) => m.roomId.includes('201'))).toBe(true)
  })
})

describe('mergePresenceWithStaff', () => {
  it('keeps students and adds teachers', () => {
    const students = filterPresenceForViewer(records, {
      role: 'admin',
      teacherRoomIds: [],
      parentStudentIds: [],
      anonymizeOthers: false,
    })
    const merged = mergePresenceWithStaff(students, DEMO_SCHOOL_LAYOUT)
    expect(merged.filter((m) => m.kind === 'student')).toHaveLength(2)
    expect(merged.filter((m) => m.kind === 'teacher').length).toBeGreaterThan(0)
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

import { describe, expect, it } from 'vitest'
import { filterPresenceForViewer, canUseFlyMode, matchMarkerByName, pickTeacherFocusRoom } from './presence'
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

describe('canUseFlyMode', () => {
  it('allows leadership roles', () => {
    expect(canUseFlyMode('principal')).toBe(true)
    expect(canUseFlyMode('teacher')).toBe(false)
  })
})

describe('pickTeacherFocusRoom', () => {
  it('prefers a layout room from teacher assignments', () => {
    expect(
      pickTeacherFocusRoom(['craft-demo-room-101'], ['craft-demo-hall', 'craft-demo-room-101'])
    ).toBe('craft-demo-room-101')
  })
})

describe('matchMarkerByName', () => {
  const markers = filterPresenceForViewer(records, {
    role: 'admin',
    teacherRoomIds: [],
    parentStudentIds: [],
    anonymizeOthers: false,
  })

  it('matches full and partial names case-insensitively', () => {
    expect(matchMarkerByName(markers, 'easton berg')).toBeUndefined()
    expect(matchMarkerByName(markers, 'alex rivera')?.id).toBe('stu-a')
    expect(matchMarkerByName(markers, 'berg')).toBeUndefined()
    expect(matchMarkerByName(markers, 'alex')?.id).toBe('stu-a')
    expect(matchMarkerByName(markers, 'Blake Chen')?.id).toBe('stu-b')
  })
})

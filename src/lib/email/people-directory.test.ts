import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMockAdmin, type MockTableHandler } from '@/lib/test/mock-supabase'

const mocks = vi.hoisted(() => ({
  admin: null as ReturnType<typeof createMockAdmin> | null,
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => {
    if (!mocks.admin) throw new Error('admin mock not set')
    return mocks.admin
  },
}))

import {
  resolvePeopleDirectory,
  searchPeopleDirectory,
  type PeopleSender,
} from './people-directory'

const schoolId = 'school-a'
const outsideSchoolId = 'school-b'
const teacherId = 'teacher-a'
const otherTeacherId = 'teacher-b'
const principalId = 'principal-a'
const assignedStudentId = 'student-assigned'
const noEmailStudentId = 'student-no-email'
const unassignedStudentId = 'student-unassigned'
const assignedParentId = 'parent-assigned'
const secondAssignedParentId = 'parent-assigned-2'
const noEmailParentId = 'parent-no-email'
const unassignedParentId = 'parent-unassigned'
const outsideParentId = 'parent-outside'

const teacherSender: PeopleSender = { id: teacherId, schoolId, role: 'teacher' }
const principalSender: PeopleSender = { id: principalId, schoolId, role: 'principal' }

type Query = { table: string; filters: Record<string, unknown> }
type ProfileRow = {
  id: string
  school_id: string
  role: string
  full_name: string | null
  email: string | null
}
type StudentRow = {
  id: string
  school_id: string
  first_name: string
  last_name: string
  grade_level: string | null
  active: boolean
}

function includesCaseInsensitive(value: string | null, pattern: unknown) {
  if (typeof pattern !== 'string') return true
  const needle = pattern.replace(/^%|%$/g, '').replace(/\\([%_,()\\])/g, '$1')
  return (value ?? '').toLocaleLowerCase().includes(needle.toLocaleLowerCase())
}

function makeDirectoryDatabase(extraParentCount = 0) {
  const queries: Query[] = []
  const extraParents: ProfileRow[] = Array.from({ length: extraParentCount }, (_, index) => ({
    id: `parent-extra-${index}`,
    school_id: schoolId,
    role: 'parent',
    full_name: `Extra Parent ${index}`,
    email: `extra-${index}@school.test`,
  }))
  const profiles: ProfileRow[] = [
    { id: teacherId, school_id: schoolId, role: 'teacher', full_name: 'Taylor Teacher', email: 'teacher@school.test' },
    { id: otherTeacherId, school_id: schoolId, role: 'teacher', full_name: 'Riley Reed', email: 'riley@school.test' },
    { id: principalId, school_id: schoolId, role: 'principal', full_name: 'Parker Principal', email: 'principal@school.test' },
    { id: assignedParentId, school_id: schoolId, role: 'parent', full_name: 'Pat Parent', email: 'PAT@school.test' },
    { id: secondAssignedParentId, school_id: schoolId, role: 'parent', full_name: 'Chris Parent', email: 'chris@school.test' },
    { id: noEmailParentId, school_id: schoolId, role: 'parent', full_name: 'No Email Parent', email: null },
    { id: unassignedParentId, school_id: schoolId, role: 'parent', full_name: 'Unassigned Parent', email: 'unassigned@school.test' },
    { id: outsideParentId, school_id: outsideSchoolId, role: 'parent', full_name: 'Outside Parent', email: 'outside@other.test' },
    ...extraParents,
  ]
  const students: StudentRow[] = [
    { id: assignedStudentId, school_id: schoolId, first_name: 'Ava', last_name: 'Reed', grade_level: '5', active: true },
    { id: noEmailStudentId, school_id: schoolId, first_name: 'Noah', last_name: 'Lane', grade_level: '4', active: true },
    { id: unassignedStudentId, school_id: schoolId, first_name: 'Unassigned', last_name: 'Student', grade_level: '6', active: true },
  ]
  const classes = [
    { id: 'class-assigned', school_id: schoolId, teacher_id: teacherId },
    { id: 'class-unassigned', school_id: schoolId, teacher_id: otherTeacherId },
  ]
  const enrollments = [
    { class_id: 'class-assigned', student_id: assignedStudentId },
    { class_id: 'class-assigned', student_id: noEmailStudentId },
    { class_id: 'class-unassigned', student_id: unassignedStudentId },
  ]
  const links = [
    { student_id: assignedStudentId, parent_id: assignedParentId },
    { student_id: assignedStudentId, parent_id: secondAssignedParentId },
    { student_id: noEmailStudentId, parent_id: noEmailParentId },
    { student_id: unassignedStudentId, parent_id: unassignedParentId },
    { student_id: unassignedStudentId, parent_id: assignedParentId },
    ...extraParents.map((parent) => ({ student_id: assignedStudentId, parent_id: parent.id })),
  ]

  function log(table: string, handler: MockTableHandler): MockTableHandler {
    return async (args) => {
      queries.push({ table, filters: { ...args.filters } })
      return handler(args)
    }
  }

  mocks.admin = createMockAdmin({
    classes: log('classes', ({ filters }) => ({
      data: classes.filter((row) =>
        (!filters.school_id || row.school_id === filters.school_id) &&
        (!filters.teacher_id || row.teacher_id === filters.teacher_id)
      ),
      error: null,
    })),
    enrollments: log('enrollments', ({ filters }) => ({
      data: enrollments.filter((row) =>
        !filters['in:class_id'] || (filters['in:class_id'] as string[]).includes(row.class_id)
      ),
      error: null,
    })),
    parent_students: log('parent_students', ({ filters }) => ({
      data: links.filter((row) =>
        (!filters['in:student_id'] || (filters['in:student_id'] as string[]).includes(row.student_id)) &&
        (!filters['in:parent_id'] || (filters['in:parent_id'] as string[]).includes(row.parent_id))
      ),
      error: null,
    })),
    profiles: log('profiles', ({ filters }) => ({
      data: profiles.filter((row) =>
        (!filters.school_id || row.school_id === filters.school_id) &&
        (!filters.role || row.role === filters.role) &&
        (!filters['in:role'] || (filters['in:role'] as string[]).includes(row.role)) &&
        (!filters['in:id'] || (filters['in:id'] as string[]).includes(row.id)) &&
        includesCaseInsensitive(row.full_name, filters['ilike:full_name'])
      ),
      error: null,
    })),
    students: log('students', ({ filters }) => {
      const rawOr = typeof filters.or === 'string' ? filters.or : null
      const pattern = rawOr?.match(/first_name\.ilike\.([^,]+)/)?.[1]
      return {
        data: students.filter((row) =>
          (!filters.school_id || row.school_id === filters.school_id) &&
          (filters.active === undefined || row.active === filters.active) &&
          (!filters['in:id'] || (filters['in:id'] as string[]).includes(row.id)) &&
          (!pattern || includesCaseInsensitive(row.first_name, pattern) || includesCaseInsensitive(row.last_name, pattern))
        ),
        error: null,
      }
    }),
  })

  return { queries }
}

describe('authorized people directory', () => {
  beforeEach(() => {
    mocks.admin = null
  })

  it('lets a teacher find all same-school faculty and only assigned families', async () => {
    makeDirectoryDatabase()
    const results = await searchPeopleDirectory(teacherSender, 'Reed')

    expect(results.map((result) => result.label)).toEqual(['Riley Reed', 'Ava Reed'])
    expect(results.map((result) => result.label)).not.toContain('Outside Parent')
    expect(results.map((result) => result.label)).not.toContain('Unassigned Student')
    expect(JSON.stringify(results)).not.toContain('@')
  })

  it('does not reveal an unassigned sibling in an authorized parent search result', async () => {
    makeDirectoryDatabase()
    const results = await searchPeopleDirectory(teacherSender, 'Pat Parent')

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({ label: 'Pat Parent', context: 'Parent of Ava Reed' })
    expect(results[0].context).not.toContain('Unassigned Student')
  })

  it('lets leadership resolve school-wide families but never another school', async () => {
    const { queries } = makeDirectoryDatabase()
    const resolution = await resolvePeopleDirectory(principalSender, [
      { kind: 'student', id: assignedStudentId },
      { kind: 'profile', id: outsideParentId },
    ])

    expect(resolution.preview.recipientCount).toBe(2)
    expect(resolution.rejectedKeys).toEqual([`profile:${outsideParentId}`])
    expect(queries.find((query) => query.table === 'profiles' && query.filters['in:id'])).toMatchObject({
      filters: { school_id: schoolId, 'in:id': [outsideParentId] },
    })
    expect(queries.find((query) => query.table === 'students')).toMatchObject({
      filters: { school_id: schoolId, active: true, 'in:id': [assignedStudentId] },
    })
  })

  it('expands a student to linked parents and deduplicates a directly selected parent', async () => {
    makeDirectoryDatabase()
    const resolution = await resolvePeopleDirectory(teacherSender, [
      { kind: 'student', id: assignedStudentId },
      { kind: 'profile', id: assignedParentId },
    ])

    expect(resolution.deliveries).toHaveLength(2)
    expect(new Set(resolution.deliveries.map((delivery) => delivery.email)).size).toBe(2)
    expect(resolution.deliveries.map((delivery) => delivery.email)).toContain('pat@school.test')
    expect(resolution.deliveries.find((delivery) => delivery.email === 'pat@school.test')?.sourceKeys).toEqual([
      `profile:${assignedParentId}`,
      `student:${assignedStudentId}`,
    ])
    expect(resolution.preview.selectedCount).toBe(2)
  })

  it('marks students without a linked parent email unavailable', async () => {
    makeDirectoryDatabase()
    const resolution = await resolvePeopleDirectory(teacherSender, [
      { kind: 'student', id: noEmailStudentId },
    ])

    expect(resolution.preview.selections[0].disabledReason).toBe('No linked parent email')
    expect(resolution.preview.recipientCount).toBe(0)
  })

  it('rejects a teacher direct profile and student references outside assigned classes', async () => {
    makeDirectoryDatabase()
    const resolution = await resolvePeopleDirectory(teacherSender, [
      { kind: 'profile', id: unassignedParentId },
      { kind: 'student', id: unassignedStudentId },
    ])

    expect(resolution.preview.selections).toEqual([])
    expect(resolution.deliveries).toEqual([])
    expect(resolution.rejectedKeys).toEqual([
      `profile:${unassignedParentId}`,
      `student:${unassignedStudentId}`,
    ])
  })

  it('uses opaque disabled previews for authorized profiles without email', async () => {
    makeDirectoryDatabase()
    const resolution = await resolvePeopleDirectory(principalSender, [
      { kind: 'profile', id: noEmailParentId },
    ])

    expect(resolution.preview.selections[0]).toMatchObject({
      key: `profile:${noEmailParentId}`,
      disabledReason: 'No usable email address',
      recipientCount: 0,
    })
    expect(JSON.stringify(resolution.preview)).not.toContain('@')
  })

  it('reauthorizes recent references and never echoes rejected references', async () => {
    makeDirectoryDatabase()
    const results = await searchPeopleDirectory(teacherSender, 'ignored', [
      { kind: 'profile', id: assignedParentId },
      { kind: 'profile', id: outsideParentId },
    ])

    expect(results.map((result) => result.key)).toEqual([`profile:${assignedParentId}`])
  })

  it('escapes PostgREST reserved search characters before building the student filter', async () => {
    const { queries } = makeDirectoryDatabase()
    await searchPeopleDirectory(principalSender, 'Re%,_()ed')

    expect(queries.find((query) => query.table === 'students')?.filters.or).toBe(
      'first_name.ilike.%Re\\%\\,\\_\\(\\)ed%,last_name.ilike.%Re\\%\\,\\_\\(\\)ed%'
    )
  })

  it('guards empty teacher scope IDs instead of emitting empty in filters', async () => {
    const { queries } = makeDirectoryDatabase()
    await searchPeopleDirectory({ ...teacherSender, id: 'teacher-without-classes' }, 'Reed')

    expect(queries.map((query) => query.table)).toEqual(['classes', 'profiles'])
    expect(queries.flatMap((query) => Object.values(query.filters))).not.toContainEqual([])
  })

  it('keeps resolution query waves bounded as selected recipients grow', async () => {
    const { queries } = makeDirectoryDatabase(20)
    const profileRefs = [assignedParentId, ...Array.from({ length: 20 }, (_, index) => `parent-extra-${index}`)]

    const resolution = await resolvePeopleDirectory(teacherSender, [
      { kind: 'student', id: assignedStudentId },
      ...profileRefs.map((id) => ({ kind: 'profile' as const, id })),
    ])

    expect(resolution.preview.selectedCount).toBe(22)
    expect(queries.filter((query) => query.table === 'classes')).toHaveLength(1)
    expect(queries.filter((query) => query.table === 'enrollments')).toHaveLength(1)
    expect(queries.filter((query) => query.table === 'parent_students')).toHaveLength(2)
    expect(queries.filter((query) => query.table === 'students')).toHaveLength(1)
    expect(queries.filter((query) => query.table === 'profiles')).toHaveLength(2)
    expect(queries.find((query) => query.table === 'profiles')?.filters['in:id']).toHaveLength(21)
  })
})

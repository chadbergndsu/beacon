import { afterEach, describe, expect, it } from 'vitest'
import {
  canEnterGrades,
  demoPrincipalEmail,
  effectiveRole,
  homePathForRole,
  isLeadership,
} from './roles'

describe('effectiveRole', () => {
  afterEach(() => {
    delete process.env.BEACON_PRINCIPAL_EMAIL
    delete process.env.BEACON_DEMO_PRINCIPAL_EMAIL
  })

  it('uses profile role by default', () => {
    expect(effectiveRole({ role: 'principal', email: 'p@school.org' })).toBe('principal')
    expect(effectiveRole({ role: 'teacher', email: 't@school.org' })).toBe('teacher')
  })

  it('elevates configured principal email only for staff/admin roles', () => {
    process.env.BEACON_PRINCIPAL_EMAIL = 'head@school.org'
    expect(demoPrincipalEmail()).toBe('head@school.org')
    expect(effectiveRole({ role: 'admin', email: 'head@school.org' })).toBe('principal')
    expect(effectiveRole({ role: 'staff', email: 'head@school.org' })).toBe('principal')
    expect(effectiveRole({ role: 'admin', email: 'other@school.org' })).toBe('admin')
    // Parents/teachers must not become principal via env alone
    expect(effectiveRole({ role: 'parent', email: 'head@school.org' })).toBe('parent')
    expect(effectiveRole({ role: 'teacher', email: 'head@school.org' })).toBe('teacher')
  })
})

describe('permissions', () => {
  it('lets leadership enter grades only for their school', () => {
    expect(
      canEnterGrades('principal', 'other-teacher', 'user-1', {
        profileSchoolId: 's1',
        classSchoolId: 's1',
      })
    ).toBe(true)
    expect(
      canEnterGrades('admin', null, 'user-1', {
        profileSchoolId: 's1',
        classSchoolId: 's2',
      })
    ).toBe(false)
    expect(canEnterGrades('principal', 't1', 'user-1')).toBe(false)
  })
  it('lets only assigned teacher enter when not leadership', () => {
    expect(
      canEnterGrades('teacher', 't1', 't1', {
        profileSchoolId: 's1',
        classSchoolId: 's1',
      })
    ).toBe(true)
    expect(
      canEnterGrades('teacher', 't1', 't1', {
        profileSchoolId: 's1',
        classSchoolId: 's2',
      })
    ).toBe(false)
    expect(canEnterGrades('teacher', 't1', 't2')).toBe(false)
    expect(canEnterGrades('parent', 't1', 'p1')).toBe(false)
  })
  it('routes principal home', () => {
    expect(homePathForRole('principal')).toBe('/principal')
    expect(homePathForRole('teacher')).toBe('/dashboard')
  })
  it('detects leadership', () => {
    expect(isLeadership('principal')).toBe(true)
    expect(isLeadership('admin')).toBe(true)
    expect(isLeadership('staff')).toBe(true)
    expect(isLeadership('teacher')).toBe(false)
    expect(isLeadership('parent')).toBe(false)
    expect(isLeadership(null)).toBe(false)
  })

  it('denies leadership grades when either school id missing', () => {
    expect(
      canEnterGrades('principal', null, 'u1', {
        profileSchoolId: null,
        classSchoolId: 's1',
      })
    ).toBe(false)
    expect(
      canEnterGrades('principal', null, 'u1', {
        profileSchoolId: 's1',
        classSchoolId: null,
      })
    ).toBe(false)
    expect(
      canEnterGrades('staff', null, 'u1', {
        profileSchoolId: 's1',
        classSchoolId: 's1',
      })
    ).toBe(true)
  })
})

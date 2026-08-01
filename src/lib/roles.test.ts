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

  it('elevates configured principal email when env set', () => {
    process.env.BEACON_PRINCIPAL_EMAIL = 'head@school.org'
    expect(demoPrincipalEmail()).toBe('head@school.org')
    expect(effectiveRole({ role: 'admin', email: 'head@school.org' })).toBe('principal')
    expect(effectiveRole({ role: 'admin', email: 'other@school.org' })).toBe('admin')
  })
})

describe('permissions', () => {
  it('lets leadership enter any class grades', () => {
    expect(canEnterGrades('principal', 'other-teacher', 'user-1')).toBe(true)
    expect(canEnterGrades('admin', null, 'user-1')).toBe(true)
  })
  it('lets only assigned teacher enter when not leadership', () => {
    expect(canEnterGrades('teacher', 't1', 't1')).toBe(true)
    expect(canEnterGrades('teacher', 't1', 't2')).toBe(false)
    expect(canEnterGrades('parent', 't1', 'p1')).toBe(false)
  })
  it('routes principal home', () => {
    expect(homePathForRole('principal')).toBe('/principal')
    expect(homePathForRole('teacher')).toBe('/dashboard')
  })
  it('detects leadership', () => {
    expect(isLeadership('principal')).toBe(true)
    expect(isLeadership('teacher')).toBe(false)
  })
})

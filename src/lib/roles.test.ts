import { describe, expect, it } from 'vitest'
import {
  canEnterGrades,
  effectiveRole,
  homePathForRole,
  isLeadership,
  PRINCIPAL_EMAIL,
} from './roles'

describe('effectiveRole', () => {
  it('elevates principal email', () => {
    expect(
      effectiveRole({ role: 'admin', email: PRINCIPAL_EMAIL })
    ).toBe('principal')
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

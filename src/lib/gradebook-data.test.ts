import { describe, expect, it } from 'vitest'
import { canAccessClass, type ClassRow } from './gradebook-data'
import type { Profile } from './types'

const classA: ClassRow = {
  id: 'c1',
  name: 'Math',
  subject: 'Math',
  grade_level: '5',
  term: '2025',
  teacher_id: 'teacher-1',
  school_id: 'school-a',
  active: true,
}

function profile(p: Partial<Profile> & Pick<Profile, 'role'>): Profile {
  return {
    id: p.id || 'u1',
    school_id: p.school_id === undefined ? 'school-a' : p.school_id,
    role: p.role,
    full_name: p.full_name ?? 'User',
    email: p.email ?? 'u@school.org',
    phone: null,
  }
}

describe('canAccessClass (multi-tenant fail-closed)', () => {
  it('denies null profile', () => {
    expect(canAccessClass(null, { id: 'u1' }, classA)).toBe(false)
  })

  it('leadership requires matching school_id', () => {
    expect(
      canAccessClass(profile({ role: 'principal', school_id: 'school-a' }), { id: 'p1' }, classA)
    ).toBe(true)
    expect(
      canAccessClass(profile({ role: 'admin', school_id: 'school-b' }), { id: 'a1' }, classA)
    ).toBe(false)
    expect(
      canAccessClass(profile({ role: 'staff', school_id: 'school-a' }), { id: 's1' }, classA)
    ).toBe(true)
  })

  it('leadership with null school_id never wildcards all schools', () => {
    expect(
      canAccessClass(profile({ role: 'principal', school_id: null }), { id: 'p1' }, classA)
    ).toBe(false)
    expect(
      canAccessClass(profile({ role: 'admin', school_id: null }), { id: 'a1' }, classA)
    ).toBe(false)
  })

  it('teachers only their class at same school', () => {
    expect(
      canAccessClass(
        profile({ role: 'teacher', school_id: 'school-a', id: 'teacher-1' }),
        { id: 'teacher-1' },
        classA
      )
    ).toBe(true)
    expect(
      canAccessClass(
        profile({ role: 'teacher', school_id: 'school-a', id: 'teacher-2' }),
        { id: 'teacher-2' },
        classA
      )
    ).toBe(false)
    expect(
      canAccessClass(
        profile({ role: 'teacher', school_id: 'school-b', id: 'teacher-1' }),
        { id: 'teacher-1' },
        classA
      )
    ).toBe(false)
  })

  it('parents pass class ACL (enrollment checked separately)', () => {
    expect(
      canAccessClass(profile({ role: 'parent', school_id: 'school-a' }), { id: 'par1' }, classA)
    ).toBe(true)
  })
})

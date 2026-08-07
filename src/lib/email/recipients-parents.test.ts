import { describe, expect, it } from 'vitest'

/**
 * Mirrors resolveParentsForStudents school binding (pure contract).
 * Linked parents with null school_id still receive digests; foreign school_id does not.
 */
function mayReceiveDigest(opts: {
  schoolId: string
  parentSchoolId: string | null
  email: string | null
}): boolean {
  if (!opts.email?.trim().includes('@')) return false
  if (opts.parentSchoolId && opts.parentSchoolId !== opts.schoolId) return false
  return true
}

describe('resolveParentsForStudents school bind (digest)', () => {
  it('allows linked parents with null school_id', () => {
    expect(
      mayReceiveDigest({
        schoolId: 'school-a',
        parentSchoolId: null,
        email: 'parent@example.com',
      })
    ).toBe(true)
  })

  it('allows same-school parents', () => {
    expect(
      mayReceiveDigest({
        schoolId: 'school-a',
        parentSchoolId: 'school-a',
        email: 'parent@example.com',
      })
    ).toBe(true)
  })

  it('blocks cross-tenant school_id', () => {
    expect(
      mayReceiveDigest({
        schoolId: 'school-a',
        parentSchoolId: 'school-b',
        email: 'parent@example.com',
      })
    ).toBe(false)
  })

  it('requires a real email', () => {
    expect(
      mayReceiveDigest({
        schoolId: 'school-a',
        parentSchoolId: null,
        email: 'not-an-email',
      })
    ).toBe(false)
  })
})

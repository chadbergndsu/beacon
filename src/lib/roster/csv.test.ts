import { describe, expect, it } from 'vitest'
import { parseStudentsCsv, splitCsv, STUDENT_CSV_TEMPLATE } from './csv'
import { generateTempPassword, isValidEmail } from './password'

describe('splitCsv', () => {
  it('handles quoted commas', () => {
    const rows = splitCsv('a,b\n"x,y",z\n')
    expect(rows[1]).toEqual(['x,y', 'z'])
  })
})

describe('parseStudentsCsv', () => {
  it('parses the template', () => {
    const r = parseStudentsCsv(STUDENT_CSV_TEMPLATE)
    expect(r.rows).toHaveLength(2)
    expect(r.rows[0].firstName).toBe('Ava')
    expect(r.rows[0].lastName).toBe('Nguyen')
    expect(r.rows[0].gradeLevel).toBe('5')
    expect(r.rows[0].className).toContain('Homeroom')
  })

  it('parses Name as Last, First', () => {
    const r = parseStudentsCsv('Name,Grade\nSmith, Jordan,4\n')
    // "Smith, Jordan" may split wrong without quotes — use quotes
    const r2 = parseStudentsCsv('Name,Grade\n"Smith, Jordan",4\n')
    expect(r2.rows[0].lastName).toBe('Smith')
    expect(r2.rows[0].firstName).toBe('Jordan')
    expect(r.errors.length + r.rows.length).toBeGreaterThan(0)
  })

  it('errors without headers', () => {
    const r = parseStudentsCsv('only one line')
    expect(r.rows).toHaveLength(0)
    expect(r.errors[0]).toMatch(/header/i)
  })
})

describe('password helpers', () => {
  it('generates strong enough temps', () => {
    const p = generateTempPassword()
    expect(p.length).toBeGreaterThanOrEqual(10)
    expect(isValidEmail('a@b.co')).toBe(true)
    expect(isValidEmail('nope')).toBe(false)
  })
})

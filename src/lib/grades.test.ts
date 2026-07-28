import { describe, expect, it } from 'vitest'
import {
  calculateTransparentGrade,
  getLetterGrade,
  validateCategoryWeights,
} from './grades'
import type { Assignment, Grade, GradeCategory } from './types'

const cats: GradeCategory[] = [
  { id: 'c1', class_id: 'cls', name: 'Tests', weight: 50, drop_lowest: 0 },
  { id: 'c2', class_id: 'cls', name: 'Homework', weight: 50, drop_lowest: 1 },
]

const assignments: Assignment[] = [
  {
    id: 'a1',
    class_id: 'cls',
    category_id: 'c1',
    title: 'Test 1',
    max_points: 100,
    is_extra_credit: false,
  },
  {
    id: 'a2',
    class_id: 'cls',
    category_id: 'c2',
    title: 'HW 1',
    max_points: 20,
    is_extra_credit: false,
  },
  {
    id: 'a3',
    class_id: 'cls',
    category_id: 'c2',
    title: 'HW 2',
    max_points: 20,
    is_extra_credit: false,
  },
]

describe('getLetterGrade', () => {
  it('maps A Beka thresholds', () => {
    expect(getLetterGrade(95)).toBe('A')
    expect(getLetterGrade(90)).toBe('A-')
    expect(getLetterGrade(84)).toBe('B')
    expect(getLetterGrade(59)).toBe('F')
  })
})

describe('validateCategoryWeights', () => {
  it('accepts weights near 100', () => {
    expect(validateCategoryWeights([{ weight: 50 }, { weight: 50 }]).ok).toBe(true)
  })
  it('rejects bad sums', () => {
    const r = validateCategoryWeights([{ weight: 40 }, { weight: 40 }])
    expect(r.ok).toBe(false)
    expect(r.sum).toBe(80)
  })
})

describe('calculateTransparentGrade', () => {
  it('weights categories and drops lowest homework', () => {
    const grades: Grade[] = [
      { assignment_id: 'a1', student_id: 's1', score: 90, is_missing: false },
      { assignment_id: 'a2', student_id: 's1', score: 10, is_missing: false }, // 50%
      { assignment_id: 'a3', student_id: 's1', score: 20, is_missing: false }, // 100%
    ]
    // HW drops lowest (50%), keeps 100%. Tests 90%. Overall = 90*0.5 + 100*0.5 = 95
    const result = calculateTransparentGrade(cats, assignments, grades)
    expect(result.overall).toBe(95)
    expect(result.letter).toBe('A')
    expect(result.breakdown.find((b) => b.name === 'Homework')?.dropped).toBe(1)
  })

  it('counts missing as zero by default', () => {
    const grades: Grade[] = [
      { assignment_id: 'a1', student_id: 's1', score: null, is_missing: true },
      { assignment_id: 'a2', student_id: 's1', score: 20, is_missing: false },
      { assignment_id: 'a3', student_id: 's1', score: 20, is_missing: false },
    ]
    const result = calculateTransparentGrade(cats, assignments, grades)
    expect(result.missingCount).toBe(1)
    expect(result.overall).not.toBeNull()
    // Tests avg 0, HW drop one of two 100%s still 100 → 50
    expect(result.overall).toBe(50)
  })
})

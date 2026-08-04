import { describe, expect, it } from 'vitest'
import {
  attendanceBatchSchema,
  gradesBatchSchema,
  pulseInputSchema,
  deviceScanBodySchema,
} from './schemas'

describe('validation schemas', () => {
  it('rejects non-finite grade scores', () => {
    const r = gradesBatchSchema.safeParse([
      {
        assignment_id: 'a1',
        student_id: '11111111-1111-4111-8111-111111111111',
        score: Number.NaN,
        is_missing: false,
      },
    ])
    expect(r.success).toBe(false)
  })

  it('accepts valid attendance batch', () => {
    const r = attendanceBatchSchema.safeParse({
      classId: '11111111-1111-4111-8111-111111111111',
      date: '2026-03-01',
      rows: [
        {
          studentId: '22222222-2222-4222-8222-222222222222',
          status: 'present',
        },
      ],
    })
    expect(r.success).toBe(true)
  })

  it('rejects bad pulse overall', () => {
    const r = pulseInputSchema.safeParse({
      studentId: '11111111-1111-4111-8111-111111111111',
      overall: 'awesome',
      note: 'hi',
    })
    expect(r.success).toBe(false)
  })

  it('requires uuid roomId on device scan', () => {
    const r = deviceScanBodySchema.safeParse({
      deviceToken: 'dev_abcdefghijklmnop',
      code: 'ABCD12',
      roomId: 'not-a-uuid',
    })
    expect(r.success).toBe(false)
  })
})

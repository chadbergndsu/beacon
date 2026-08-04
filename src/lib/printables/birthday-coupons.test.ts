import { describe, expect, it } from 'vitest'
import { BIRTHDAY_COUPONS, couponCount } from './birthday-coupons'

describe('birthday coupons', () => {
  it('includes the classroom freebies teachers asked for', () => {
    const titles = BIRTHDAY_COUPONS.map((c) => c.title.toLowerCase())
    expect(titles.some((t) => t.includes('homework'))).toBe(true)
    expect(titles.some((t) => t.includes('sit anywhere'))).toBe(true)
    expect(titles.some((t) => t.includes('snack'))).toBe(true)
    expect(titles.some((t) => t.includes('line leader'))).toBe(true)
    expect(titles.some((t) => t.includes('messy desk'))).toBe(true)
    expect(titles.some((t) => t.includes('story'))).toBe(true)
  })

  it('has a full book worth of coupons', () => {
    expect(couponCount()).toBeGreaterThanOrEqual(10)
    for (const c of BIRTHDAY_COUPONS) {
      expect(c.id).toBeTruthy()
      expect(c.title.length).toBeGreaterThan(2)
      expect(c.blurb.length).toBeGreaterThan(10)
    }
  })
})

import { describe, expect, it } from 'vitest'
import { buildSchoolContextLinks, designPartnerInquirySchema } from './design-partner'

describe('designPartnerInquirySchema', () => {
  const valid = {
    name: 'Jordan Lee',
    role: 'Head of School',
    email: 'jordan@school.org',
    school: 'Example Academy',
    priority: 'We want family updates to be easier to understand.',
  }

  it('accepts a bounded school inquiry', () => {
    expect(designPartnerInquirySchema.safeParse(valid).success).toBe(true)
  })

  it('rejects oversized notes and malformed email', () => {
    expect(
      designPartnerInquirySchema.safeParse({
        ...valid,
        email: 'not-an-email',
        priority: 'x'.repeat(1201),
      }).success
    ).toBe(false)
  })
})

describe('buildSchoolContextLinks', () => {
  it('preserves validated school and slug context for the round trip', () => {
    expect(buildSchoolContextLinks({ school: 'north-campus' })).toEqual({
      schoolHref: '/school?school=north-campus',
      beaconHref: '/about?school=north-campus',
      trustHref: '/privacy?school=north-campus',
    })
    expect(buildSchoolContextLinks({ slug: 'south_2' })).toEqual({
      schoolHref: '/school?slug=south_2',
      beaconHref: '/about?slug=south_2',
      trustHref: '/privacy?slug=south_2',
    })
  })

  it('drops malformed context instead of reflecting it into links', () => {
    expect(buildSchoolContextLinks({ school: 'https://evil.example/path' })).toEqual({
      schoolHref: '/school',
      beaconHref: '/about',
      trustHref: '/privacy',
    })
  })
})

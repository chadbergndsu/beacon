import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const action = readFileSync('src/app/actions/design-partner.ts', 'utf8')
const page = readFileSync('src/app/about/page.tsx', 'utf8')

describe('public design-partner inquiry boundary', () => {
  it('keeps the owner inbox server-side and uses abuse controls', () => {
    expect(action).toContain('resolveFeedbackOwnerEmail')
    expect(action).toContain('rateLimitAsync')
    expect(action).toContain('consume_public_inquiry_rate_limits')
    expect(action).toContain("formData.get('website')")
    expect(action).toContain('queueAndSendEmail')
    expect(page).not.toContain('mailto:')
  })

  it('warns submitters not to include student information', () => {
    const form = readFileSync('src/components/marketing/DesignPartnerInquiryForm.tsx', 'utf8')
    expect(form).toContain('Do not include student names, records or other sensitive information.')
  })
})

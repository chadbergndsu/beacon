import { describe, expect, it } from 'vitest'
import { isInsecureEmailFrom, shouldRewriteReplyToInbound } from './send'

describe('isInsecureEmailFrom', () => {
  it('flags Resend onboarding sender', () => {
    expect(isInsecureEmailFrom('Beacon <onboarding@resend.dev>')).toBe(true)
    expect(isInsecureEmailFrom('onboarding@resend.dev')).toBe(true)
  })

  it('allows verified domain senders', () => {
    expect(isInsecureEmailFrom('School <office@lca.org>')).toBe(false)
    expect(isInsecureEmailFrom('Beacon <noreply@beacon.commoncentsip.com>')).toBe(false)
  })
})

describe('shouldRewriteReplyToInbound', () => {
  it('keeps human Reply-To on owner-bound kinds', () => {
    expect(shouldRewriteReplyToInbound('school_inquiry')).toBe(false)
    expect(shouldRewriteReplyToInbound('pilot_feedback')).toBe(false)
  })

  it('allows inbound rewrite on family / school outbound kinds', () => {
    expect(shouldRewriteReplyToInbound('message')).toBe(true)
    expect(shouldRewriteReplyToInbound('announcement')).toBe(true)
    expect(shouldRewriteReplyToInbound('dinner_digest')).toBe(true)
  })
})

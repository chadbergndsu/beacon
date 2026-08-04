import { afterEach, describe, expect, it } from 'vitest'
import { resolveFeedbackOwnerEmail } from './owner'
import { safeReplyTo } from './notify-owner'

describe('resolveFeedbackOwnerEmail', () => {
  afterEach(() => {
    delete process.env.BEACON_FEEDBACK_TO
    delete process.env.BEACON_OWNER_EMAIL
  })

  it('prefers BEACON_FEEDBACK_TO', () => {
    process.env.BEACON_OWNER_EMAIL = 'owner@example.com'
    process.env.BEACON_FEEDBACK_TO = 'pilot@example.com'
    expect(resolveFeedbackOwnerEmail()).toBe('pilot@example.com')
  })

  it('parses Name <email> form', () => {
    process.env.BEACON_FEEDBACK_TO = 'Chad <chad@school.org>'
    expect(resolveFeedbackOwnerEmail()).toBe('chad@school.org')
  })

  it('returns null when unset', () => {
    expect(resolveFeedbackOwnerEmail()).toBeNull()
  })
})

describe('safeReplyTo', () => {
  it('drops .test demo addresses that break Resend', () => {
    expect(safeReplyTo('teacher@lighthouse.test')).toBeUndefined()
    expect(safeReplyTo('real.person@gmail.com')).toBe('real.person@gmail.com')
  })
})

import { describe, expect, it } from 'vitest'
import { isInsecureEmailFrom } from './send'

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

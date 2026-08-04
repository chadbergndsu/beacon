import { afterEach, describe, expect, it } from 'vitest'
import { parseEmailTransports } from './transport'

describe('parseEmailTransports', () => {
  afterEach(() => {
    delete process.env.EMAIL_TRANSPORTS
    delete process.env.RESEND_API_KEY
    delete process.env.SMTP_HOST
    delete process.env.SMTP_URL
  })

  it('defaults to resend then log when only Resend is set', () => {
    expect(
      parseEmailTransports(null, { resendConfigured: true, smtpConfigured: false })
    ).toEqual(['resend', 'log'])
  })

  it('defaults to smtp then log when only SMTP is set', () => {
    expect(
      parseEmailTransports(null, { resendConfigured: false, smtpConfigured: true })
    ).toEqual(['smtp', 'log'])
  })

  it('cascades resend → smtp → log when both live', () => {
    expect(
      parseEmailTransports(null, { resendConfigured: true, smtpConfigured: true })
    ).toEqual(['resend', 'smtp', 'log'])
  })

  it('honors EMAIL_TRANSPORTS override and appends log', () => {
    expect(
      parseEmailTransports('smtp,resend', {
        resendConfigured: true,
        smtpConfigured: true,
      })
    ).toEqual(['smtp', 'resend', 'log'])
  })

  it('log-only when nothing configured', () => {
    expect(
      parseEmailTransports(null, { resendConfigured: false, smtpConfigured: false })
    ).toEqual(['log'])
  })
})

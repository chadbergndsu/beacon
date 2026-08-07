import { afterEach, describe, expect, it } from 'vitest'
import { isEmailHonestLive, parseEmailTransports } from './transport'

describe('parseEmailTransports', () => {
  afterEach(() => {
    delete process.env.EMAIL_TRANSPORTS
    delete process.env.RESEND_API_KEY
    delete process.env.SMTP_HOST
    delete process.env.SMTP_URL
    delete process.env.EMAIL_FROM
    delete process.env.VERCEL_ENV
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

  it('does not report live delivery when an override disables configured Resend', () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Beacon <hello@beacon.example>'
    process.env.EMAIL_TRANSPORTS = 'log'
    expect(isEmailHonestLive()).toBe(false)
  })

  it('reports live delivery when an enabled transport is configured', () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Beacon <hello@beacon.example>'
    process.env.EMAIL_TRANSPORTS = 'resend,log'
    expect(isEmailHonestLive()).toBe(true)
  })

  it('rejects the Resend onboarding sender in production', () => {
    process.env.RESEND_API_KEY = 're_test'
    process.env.EMAIL_FROM = 'Beacon <onboarding@resend.dev>'
    process.env.EMAIL_TRANSPORTS = 'resend'
    process.env.VERCEL_ENV = 'production'
    expect(isEmailHonestLive()).toBe(false)
  })

  it('does not report malformed or non-SMTP URLs as a live transport', () => {
    process.env.EMAIL_FROM = 'Beacon <hello@beacon.example>'
    process.env.SMTP_URL = 'not a url'
    expect(isEmailHonestLive()).toBe(false)
    process.env.SMTP_URL = 'https://example.com/mail'
    expect(isEmailHonestLive()).toBe(false)
    process.env.SMTP_URL = 'smtps://mailer.example.com:465'
    expect(isEmailHonestLive()).toBe(true)
  })
})

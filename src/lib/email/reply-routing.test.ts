import { createHmac } from 'node:crypto'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import {
  buildInboundReplyTo,
  extractEmailAddress,
  extractReplyTokenFromAddresses,
  generateReplyToken,
  isEmailInboundConfigured,
} from './reply-routing'
import { verifyBeaconInboundHmac, verifySvixSignature } from './inbound'

describe('reply-routing', () => {
  const prev = { ...process.env }

  afterEach(() => {
    process.env = { ...prev }
  })

  it('generates hex reply tokens', () => {
    const t = generateReplyToken()
    expect(t).toMatch(/^[a-f0-9]{36}$/)
  })

  it('builds plus-address Reply-To when domain set', () => {
    process.env.EMAIL_INBOUND_DOMAIN = 'inbound.school.org'
    const token = 'a'.repeat(36)
    expect(buildInboundReplyTo(token)).toBe(`reply+${token}@inbound.school.org`)
  })

  it('extracts token from reply+ addresses', () => {
    const token = 'b'.repeat(36)
    expect(
      extractReplyTokenFromAddresses([`Parent <reply+${token}@inbound.school.org>`])
    ).toBe(token)
  })

  it('extracts email from angle brackets', () => {
    expect(extractEmailAddress('Pat Parent <pat@school.org>')).toBe('pat@school.org')
  })

  it('isEmailInboundConfigured requires domain + secret', () => {
    delete process.env.EMAIL_INBOUND_DOMAIN
    delete process.env.EMAIL_INBOUND_WEBHOOK_SECRET
    delete process.env.RESEND_WEBHOOK_SECRET
    expect(isEmailInboundConfigured()).toBe(false)

    process.env.EMAIL_INBOUND_DOMAIN = 'in.example.com'
    process.env.EMAIL_INBOUND_WEBHOOK_SECRET = 'x'.repeat(20)
    expect(isEmailInboundConfigured()).toBe(true)
  })
})

describe('inbound signature verify', () => {
  const prev = { ...process.env }

  beforeEach(() => {
    process.env.EMAIL_INBOUND_WEBHOOK_SECRET = 'test-secret-at-least-16'
  })

  afterEach(() => {
    process.env = { ...prev }
  })

  it('verifies beacon HMAC', () => {
    const body = '{"from":"a@b.com","to":"x@y.com","subject":"hi","text":"yo"}'
    const sig = createHmac('sha256', 'test-secret-at-least-16').update(body).digest('hex')
    expect(verifyBeaconInboundHmac(body, `sha256=${sig}`)).toBe(true)
    expect(verifyBeaconInboundHmac(body, 'sha256=deadbeef')).toBe(false)
  })

  it('verifies svix-style signatures', () => {
    const secret = 'whsec_' + Buffer.from('super-secret-bytes!!').toString('base64')
    const body = '{"type":"email.received"}'
    const id = 'msg_123'
    const ts = '1710000000'
    const signed = `${id}.${ts}.${body}`
    const expected = createHmac('sha256', Buffer.from('super-secret-bytes!!'))
      .update(signed)
      .digest('base64')

    expect(
      verifySvixSignature({
        body,
        svixId: id,
        svixTimestamp: ts,
        svixSignature: `v1,${expected}`,
        secret,
      })
    ).toBe(true)

    expect(
      verifySvixSignature({
        body,
        svixId: id,
        svixTimestamp: ts,
        svixSignature: 'v1,nope',
        secret,
      })
    ).toBe(false)
  })
})

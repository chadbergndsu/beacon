import { afterEach, describe, expect, it } from 'vitest'
import { deliverWithCascade } from './transport'
import type { OutboundEmail } from './types'

const sample: OutboundEmail = {
  school_id: 's1',
  kind: 'system',
  to_email: 'a@b.com',
  to_name: null,
  subject: 'Hi',
  body_text: 'Hello',
  body_html: null,
  related_table: null,
  related_id: null,
  meta: {},
}

describe('deliverWithCascade forceLogOnly', () => {
  afterEach(() => {
    delete process.env.RESEND_API_KEY
  })

  it('never hits live transport when forceLogOnly', async () => {
    process.env.RESEND_API_KEY = 're_test_should_not_send'
    const r = await deliverWithCascade(sample, 'Beacon <onboarding@resend.dev>', undefined, {
      forceLogOnly: true,
      forceLogReason: 'test guard',
    })
    expect(r.status).toBe('skipped')
    expect(r.provider).toBe('log')
    expect(r.error).toMatch(/test guard/)
    expect(r.attempts).toHaveLength(1)
    expect(r.attempts[0]?.provider).toBe('log')
  })
})

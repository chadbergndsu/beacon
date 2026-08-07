import { describe, expect, it } from 'vitest'
import { buildDeskBrief, deskIntentions, kindLabel } from './desk'
import type { EmailInboxRow, EmailOutboxRow } from '@/lib/email/types'

function inbox(partial: Partial<EmailInboxRow> & { id: string }): EmailInboxRow {
  return {
    school_id: 's1',
    outbox_id: null,
    from_email: 'p@x.com',
    from_name: 'Pat',
    to_email: 'reply@in',
    subject: 'Re: hi',
    body_text: 'Thanks',
    body_html: null,
    status: 'received',
    provider: 'simulate',
    provider_message_id: null,
    reply_token: null,
    meta: {},
    created_at: new Date().toISOString(),
    reviewed_at: null,
    reviewed_by: null,
    ...partial,
  }
}

function out(partial: Partial<EmailOutboxRow> & { id: string }): EmailOutboxRow {
  return {
    school_id: 's1',
    kind: 'message',
    to_email: 'p@x.com',
    to_name: null,
    subject: 'Hi',
    body_text: 'Body',
    body_html: null,
    status: 'sent',
    provider: 'log',
    error: null,
    related_table: null,
    related_id: null,
    meta: {},
    created_at: new Date().toISOString(),
    sent_at: null,
    ...partial,
  }
}

describe('Family Desk helpers', () => {
  it('builds brief from unread + failures', () => {
    const brief = buildDeskBrief({
      inbox: [
        inbox({ id: '1', status: 'received' }),
        inbox({ id: '2', status: 'reviewed' }),
      ],
      outbox: [
        out({ id: 'a', status: 'failed' }),
        out({ id: 'b', status: 'sent' }),
      ],
    })
    expect(brief.unreadReplies).toBe(1)
    expect(brief.failedLast24h).toBe(1)
    expect(brief.sentLast24h).toBe(1)
    expect(brief.latestUnread).toHaveLength(1)
  })

  it('offers intention starters', () => {
    const items = deskIntentions('LCA')
    expect(items.length).toBeGreaterThanOrEqual(3)
    expect(items[0].subject).toContain('LCA')
  })

  it('labels kinds for humans', () => {
    expect(kindLabel('dinner_digest')).toBe('Dinner Table')
    expect(kindLabel('mystery')).toBe('mystery')
  })
})

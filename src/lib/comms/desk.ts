/**
 * Family Desk — daily-driver messaging model on email_outbox / email_inbox.
 * Not chat: kind-aware notes home that always log delivery + replies.
 */

import type { EmailInboxRow, EmailKind, EmailOutboxRow } from '@/lib/email/types'

export type DeskIntention = {
  id: string
  label: string
  blurb: string
  subject: string
  body: string
  audience: 'parents' | 'teachers' | 'staff' | 'all'
}

export type DeskBrief = {
  unreadReplies: number
  failedLast24h: number
  sentLast24h: number
  latestUnread: EmailInboxRow[]
  needsAttention: EmailOutboxRow[]
}

export const KIND_LABEL: Record<EmailKind, string> = {
  announcement: 'Announcement',
  system: 'Office note',
  grade_notice: 'Grade update',
  attendance_notice: 'Attendance',
  aftercare_notice: 'Aftercare',
  dinner_digest: 'Dinner Table',
  missing_work: 'Missing work',
  message: 'Family note',
  welcome: 'Welcome',
  test: 'Delivery test',
  pilot_feedback: 'Pilot',
  invoice: 'Billing',
}

export const KIND_TONE: Record<
  EmailKind,
  'sky' | 'navy' | 'success' | 'warning' | 'muted' | 'default'
> = {
  announcement: 'sky',
  system: 'navy',
  grade_notice: 'sky',
  attendance_notice: 'warning',
  aftercare_notice: 'warning',
  dinner_digest: 'success',
  missing_work: 'warning',
  message: 'default',
  welcome: 'success',
  test: 'muted',
  pilot_feedback: 'muted',
  invoice: 'navy',
}

/** One-tap compose starters — short, plain-language family notes. */
export function deskIntentions(schoolShortName: string): DeskIntention[] {
  const who = schoolShortName || 'school'
  return [
    {
      id: 'celebrate',
      label: 'Celebrate a win',
      blurb: 'Warm note home when a student shines',
      subject: `A bright moment at ${who}`,
      body: `We wanted you to know something went especially well today.\n\n[Who / what happened]\n\nGrateful for your partnership,\n${who}`,
      audience: 'parents',
    },
    {
      id: 'missing',
      label: 'Missing work nudge',
      blurb: 'Calm reminder — past-due without panic',
      subject: `Quick note on missing work — ${who}`,
      body: `Hello,\n\nA few assignments still need attention. Opening Beacon shows the calm list of what’s past due vs coming up.\n\nWe’re here to help — reply to this email anytime.\n\n${who}`,
      audience: 'parents',
    },
    {
      id: 'reminder',
      label: 'Event reminder',
      blurb: 'Picture day, early release, field trip',
      subject: `Reminder from ${who}`,
      body: `Hello families,\n\nA quick reminder:\n\n[What / when / what to bring]\n\nQuestions? Just reply.\n\n${who}`,
      audience: 'parents',
    },
    {
      id: 'gentle',
      label: 'Gently watch',
      blurb: 'Soft check-in when a student needs care',
      subject: `Checking in from ${who}`,
      body: `Hello,\n\nWe wanted to share a gentle observation and partner with you.\n\n[What we’re noticing]\n[How we can help together]\n\nReply anytime — we’re listening.\n\n${who}`,
      audience: 'parents',
    },
  ]
}

export function buildDeskBrief(input: {
  inbox: EmailInboxRow[]
  outbox: EmailOutboxRow[]
  nowMs?: number
}): DeskBrief {
  const now = input.nowMs ?? Date.now()
  const dayAgo = now - 24 * 60 * 60 * 1000

  const unread = input.inbox.filter((r) => r.status === 'received')
  const failedLast24h = input.outbox.filter(
    (r) =>
      r.status === 'failed' &&
      r.created_at &&
      new Date(r.created_at).getTime() >= dayAgo
  )
  const sentLast24h = input.outbox.filter(
    (r) =>
      r.status === 'sent' &&
      r.created_at &&
      new Date(r.created_at).getTime() >= dayAgo
  ).length

  return {
    unreadReplies: unread.length,
    failedLast24h: failedLast24h.length,
    sentLast24h,
    latestUnread: unread.slice(0, 5),
    needsAttention: failedLast24h.slice(0, 5),
  }
}

export function kindLabel(kind: string | undefined): string {
  if (!kind) return 'Note'
  return KIND_LABEL[kind as EmailKind] || kind.replace(/_/g, ' ')
}

export function kindTone(
  kind: string | undefined
): 'sky' | 'navy' | 'success' | 'warning' | 'muted' | 'default' {
  if (!kind) return 'muted'
  return KIND_TONE[kind as EmailKind] || 'muted'
}

export type EmailKind =
  | 'announcement'
  | 'system'
  | 'grade_notice'
  | 'attendance_notice'
  | 'aftercare_notice'
  | 'dinner_digest'
  | 'missing_work'
  | 'message'
  | 'welcome'
  | 'test'
  | 'pilot_feedback'
  | 'invoice'

export type EmailStatus = 'queued' | 'sent' | 'failed' | 'skipped'

export type InboxStatus = 'received' | 'reviewed' | 'archived' | 'spam'

export type OutboundEmail = {
  school_id: string | null
  kind: EmailKind
  to_email: string
  to_name?: string | null
  subject: string
  body_text: string
  body_html?: string | null
  /** School office reply path — never the Resend noreply alone when brand has email */
  reply_to?: string | null
  related_table?: string | null
  related_id?: string | null
  meta?: Record<string, unknown>
  /** Set by send path when inbound capture is configured */
  reply_token?: string | null
}

export type EmailOutboxRow = OutboundEmail & {
  id: string
  status: EmailStatus
  provider: string | null
  error: string | null
  created_at: string
  sent_at: string | null
}

export type EmailInboxRow = {
  id: string
  school_id: string
  outbox_id: string | null
  from_email: string
  from_name: string | null
  to_email: string
  subject: string
  body_text: string
  body_html: string | null
  status: InboxStatus
  provider: string | null
  provider_message_id: string | null
  reply_token: string | null
  meta: Record<string, unknown>
  created_at: string
  reviewed_at: string | null
  reviewed_by: string | null
}

/** Normalized inbound payload after webhook parse */
export type InboundEmailPayload = {
  from: string
  fromName?: string | null
  to: string | string[]
  receivedFor?: string[]
  subject: string
  bodyText: string
  bodyHtml?: string | null
  provider?: string
  providerMessageId?: string | null
  replyToken?: string | null
  schoolId?: string | null
  meta?: Record<string, unknown>
}

export type EmailDeliveryStats = {
  total: number
  sent: number
  failed: number
  skipped: number
  queued: number
  last24h: number
  emailLive: boolean
  fromAddress: string
}

export type EmailKind =
  | 'announcement'
  | 'system'
  | 'grade_notice'
  | 'attendance_notice'
  | 'dinner_digest'
  | 'missing_work'
  | 'message'
  | 'welcome'
  | 'test'
  | 'pilot_feedback'

export type EmailStatus = 'queued' | 'sent' | 'failed' | 'skipped'

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
}

export type EmailOutboxRow = OutboundEmail & {
  id: string
  status: EmailStatus
  provider: string | null
  error: string | null
  created_at: string
  sent_at: string | null
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

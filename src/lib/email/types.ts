export type EmailKind =
  | 'announcement'
  | 'system'
  | 'grade_notice'
  | 'welcome'

export type EmailStatus = 'queued' | 'sent' | 'failed' | 'skipped'

export type OutboundEmail = {
  school_id: string | null
  kind: EmailKind
  to_email: string
  to_name?: string | null
  subject: string
  body_text: string
  body_html?: string | null
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

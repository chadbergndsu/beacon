import { queueAndSendEmail } from '@/lib/email/send'
import { FEEDBACK_CATEGORY_LABEL, type FeedbackCategory } from './types'
import { resolveFeedbackOwnerEmail } from './owner'

export type OwnerNotifyInput = {
  feedbackId: string
  schoolId: string | null
  category: FeedbackCategory
  message: string
  pagePath: string | null
  pageTitle: string | null
  submitterName: string | null
  submitterEmail: string | null
  role: string | null
}

/**
 * Primary routing: email the product owner. Principal is not the destination.
 */
export async function notifyOwnerOfPilotFeedback(
  input: OwnerNotifyInput
): Promise<{ sent: boolean; to: string | null; error?: string }> {
  const to = resolveFeedbackOwnerEmail()
  if (!to) {
    console.warn(
      '[beacon-pilot-feedback] BEACON_FEEDBACK_TO / BEACON_OWNER_EMAIL not set — suggestion saved but not emailed to owner'
    )
    return {
      sent: false,
      to: null,
      error: 'BEACON_FEEDBACK_TO not configured',
    }
  }

  const cat = FEEDBACK_CATEGORY_LABEL[input.category] || input.category
  const who =
    [input.submitterName, input.submitterEmail, input.role]
      .filter(Boolean)
      .join(' · ') || 'Signed-in pilot user'
  const page = input.pagePath || '(unknown page)'
  const subject = `[Beacon pilot] ${cat}: ${input.message.slice(0, 60)}${
    input.message.length > 60 ? '…' : ''
  }`

  const body_text = [
    'New pilot suggestion (routed to product owner — not the principal).',
    '',
    `Category: ${cat}`,
    `From: ${who}`,
    `Page: ${page}`,
    input.pageTitle ? `Title: ${input.pageTitle}` : null,
    input.schoolId ? `School id: ${input.schoolId}` : null,
    `Feedback id: ${input.feedbackId}`,
    '',
    '——— Message ———',
    input.message,
    '',
    'Principal can also read this in Beacon → Principal office → Pilot feedback.',
  ]
    .filter((line) => line !== null)
    .join('\n')

  const body_html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;line-height:1.5;color:#0b1220">
      <p style="font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#6d28d9;margin:0 0 8px">
        Beacon pilot · product owner
      </p>
      <h1 style="font-size:18px;margin:0 0 12px">New ${escapeHtml(cat).toLowerCase()}</h1>
      <p style="margin:0 0 8px;font-size:14px;color:#475569">
        <strong>From:</strong> ${escapeHtml(who)}<br/>
        <strong>Page:</strong> <code>${escapeHtml(page)}</code>
      </p>
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:14px;background:#f8fafc;white-space:pre-wrap;font-size:14px">
${escapeHtml(input.message)}
      </div>
      <p style="margin:16px 0 0;font-size:12px;color:#64748b">
        Id: ${escapeHtml(input.feedbackId)}. Principal can view in-app; this email is the primary inbox.
      </p>
    </div>
  `

  try {
    const result = await queueAndSendEmail({
      school_id: input.schoolId,
      kind: 'pilot_feedback',
      to_email: to,
      to_name: 'Beacon product owner',
      subject,
      body_text,
      body_html,
      // Reply goes to the submitter when we have their email
      reply_to: input.submitterEmail || undefined,
      related_table: 'pilot_feedback',
      related_id: input.feedbackId,
      meta: {
        route: 'product_owner',
        category: input.category,
        page_path: input.pagePath,
      },
    })

    return {
      sent: result.status === 'sent',
      to,
      error: result.error,
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Owner notify failed'
    console.error('[beacon-pilot-feedback] notify failed', msg)
    return { sent: false, to, error: msg }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

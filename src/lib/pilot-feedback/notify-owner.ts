import { queueAndSendEmail } from '@/lib/email/send'
import { isEmailLive } from '@/lib/email/transport'
import { isNtfyConfigured, publishNtfy } from '@/lib/notify/ntfy'
import { isSlackConfigured, publishSlack } from '@/lib/notify/slack'
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

export type OwnerNotifyResult = {
  emailed: boolean
  pushed: boolean
  slacked: boolean
  emailTo: string | null
  emailError?: string
  pushError?: string
  slackError?: string
  /** Human-readable multi-channel status */
  note: string
}

/**
 * Primary routing: product owner (email cascade + ntfy push).
 * Principal is not emailed; they can still read in-app.
 */
export async function notifyOwnerOfPilotFeedback(
  input: OwnerNotifyInput
): Promise<OwnerNotifyResult> {
  const cat = FEEDBACK_CATEGORY_LABEL[input.category] || input.category
  const who =
    [input.submitterName, input.submitterEmail, input.role]
      .filter(Boolean)
      .join(' · ') || 'Signed-in pilot user'
  const page = input.pagePath || '(unknown page)'

  const [emailResult, pushResult, slackResult] = await Promise.all([
    deliverOwnerEmail(input, cat, who, page),
    deliverOwnerPush(input, cat, who, page),
    deliverOwnerSlack(input, cat, who, page),
  ])

  const parts: string[] = []
  if (emailResult.emailed) parts.push('emailed owner')
  else if (emailResult.emailError) parts.push(`email: ${emailResult.emailError}`)
  if (pushResult.pushed) parts.push('pushed to phone (ntfy)')
  else if (pushResult.pushError && !pushResult.pushError.includes('not configured')) {
    parts.push(`push: ${pushResult.pushError}`)
  }
  if (slackResult.slacked) parts.push('posted to Slack')
  else if (slackResult.slackError && !slackResult.slackError.includes('not configured')) {
    parts.push(`slack: ${slackResult.slackError}`)
  }

  let note: string
  if (emailResult.emailed || pushResult.pushed || slackResult.slacked) {
    const delivered: string[] = []
    if (emailResult.emailed) delivered.push('emailed owner')
    if (pushResult.pushed) delivered.push('pushed to phone')
    if (slackResult.slacked) delivered.push('posted to Slack')
    note = `Saved · ${delivered.join(' · ')}.`
    if (emailResult.emailed && !pushResult.pushed && !isNtfyConfigured()) {
      note += ' Tip: set BEACON_NTFY_URL for phone push.'
    }
    if (!slackResult.slacked && !isSlackConfigured()) {
      note += ' Tip: set BEACON_SLACK_WEBHOOK_URL for office Slack.'
    }
  } else {
    note =
      parts.length > 0
        ? `Saved in Beacon. Delivery: ${parts.join(' · ')}`
        : 'Saved in Beacon. Configure BEACON_FEEDBACK_TO, BEACON_NTFY_URL, and/or BEACON_SLACK_WEBHOOK_URL for owner alerts.'
  }

  return {
    emailed: emailResult.emailed,
    pushed: pushResult.pushed,
    slacked: slackResult.slacked,
    emailTo: emailResult.emailTo,
    emailError: emailResult.emailError,
    pushError: pushResult.pushError,
    slackError: slackResult.slackError,
    note,
  }
}

async function deliverOwnerEmail(
  input: OwnerNotifyInput,
  cat: string,
  who: string,
  page: string
): Promise<Pick<OwnerNotifyResult, 'emailed' | 'emailTo' | 'emailError'>> {
  const to = resolveFeedbackOwnerEmail()
  if (!to) {
    return {
      emailed: false,
      emailTo: null,
      emailError: 'BEACON_FEEDBACK_TO not configured',
    }
  }
  if (!isEmailLive()) {
    // Still attempt cascade (log-only) so outbox has a row
  }

  const subject = `[Beacon pilot] ${cat}: ${input.message.slice(0, 60)}${
    input.message.length > 60 ? '…' : ''
  }`

  const body_text = [
    'New pilot suggestion (product owner — not the principal).',
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
    'View in Beacon: Principal → Pilot feedback (read-only for school).',
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
        Id: ${escapeHtml(input.feedbackId)}. Transport cascade: Resend → SMTP → log.
      </p>
    </div>
  `

  const replyTo = safeReplyTo(input.submitterEmail)

  try {
    const result = await queueAndSendEmail({
      school_id: input.schoolId,
      kind: 'pilot_feedback',
      to_email: to,
      to_name: 'Beacon product owner',
      subject,
      body_text,
      body_html,
      reply_to: replyTo,
      related_table: 'pilot_feedback',
      related_id: input.feedbackId,
      meta: {
        route: 'product_owner',
        category: input.category,
        page_path: input.pagePath,
        submitter_email: input.submitterEmail,
      },
    })

    return {
      emailed: result.status === 'sent',
      emailTo: to,
      emailError: result.status === 'sent' ? undefined : result.error,
    }
  } catch (e) {
    return {
      emailed: false,
      emailTo: to,
      emailError: e instanceof Error ? e.message : 'Owner email failed',
    }
  }
}

async function deliverOwnerPush(
  input: OwnerNotifyInput,
  cat: string,
  who: string,
  page: string
): Promise<Pick<OwnerNotifyResult, 'pushed' | 'pushError'>> {
  if (!isNtfyConfigured()) {
    return { pushed: false, pushError: 'ntfy not configured' }
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://beacon.commoncentsip.com')

  const result = await publishNtfy({
    title: `Beacon pilot · ${cat}`,
    message: `${who}\n${page}\n\n${input.message.slice(0, 500)}`,
    tags: ['school', 'beacon', input.category === 'issue' ? 'warning' : 'bulb'],
    priority: input.category === 'issue' ? 'urgent' : 'high',
    click: `${appUrl.replace(/\/$/, '')}/principal/feedback`,
  })

  return {
    pushed: result.ok,
    pushError: result.ok ? undefined : result.error,
  }
}

async function deliverOwnerSlack(
  input: OwnerNotifyInput,
  cat: string,
  who: string,
  page: string
): Promise<Pick<OwnerNotifyResult, 'slacked' | 'slackError'>> {
  if (!isSlackConfigured()) {
    return { slacked: false, slackError: 'Slack not configured' }
  }

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : 'https://beacon.commoncentsip.com')

  const result = await publishSlack({
    title: `Beacon pilot · ${cat}`,
    text: input.message.slice(0, 1500),
    fields: [
      { label: 'From', value: who },
      { label: 'Page', value: page },
    ],
    link: {
      label: 'Open pilot feedback',
      url: `${appUrl.replace(/\/$/, '')}/principal/feedback`,
    },
  })

  return {
    slacked: result.ok,
    slackError: result.ok ? undefined : result.error,
  }
}

/** Resend rejects fake domains like .test — omit Reply-To rather than fail delivery. */
export function safeReplyTo(email: string | null | undefined): string | undefined {
  if (!email) return undefined
  const e = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return undefined
  if (
    e.endsWith('.test') ||
    e.endsWith('.example') ||
    e.endsWith('.invalid') ||
    e.endsWith('.local')
  ) {
    return undefined
  }
  return e
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

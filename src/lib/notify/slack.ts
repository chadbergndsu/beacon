/**
 * Slack outbound notify for school office / ops channels.
 * Soft-fail when not configured (same pattern as ntfy).
 *
 * Preferred (Incoming Webhook):
 *   BEACON_SLACK_WEBHOOK_URL=https://hooks.slack.com/services/…
 *
 * Optional Bot API (chat.postMessage):
 *   BEACON_SLACK_BOT_TOKEN=xoxb-…
 *   BEACON_SLACK_CHANNEL=#office   (or channel ID C…)
 *
 * Optional:
 *   BEACON_SLACK_USERNAME=Beacon   (webhook display name override)
 */

export type SlackMessageInput = {
  text: string
  /** Optional Block Kit / attachment-style header */
  title?: string
  /** Markdown-ish body shown under title (mrkdwn) */
  fields?: { label: string; value: string }[]
  /** Optional link button */
  link?: { label: string; url: string } | null
}

export type SlackPublishResult = {
  ok: boolean
  skipped: boolean
  error?: string
  mode?: 'webhook' | 'bot'
}

function webhookUrl(): string | null {
  const raw = process.env.BEACON_SLACK_WEBHOOK_URL?.trim()
  if (!raw) return null
  try {
    const u = new URL(raw)
    if (u.protocol !== 'https:') return null
    // Accept Slack hosted webhooks only (avoid SSRF to arbitrary hosts)
    if (u.hostname !== 'hooks.slack.com') return null
    if (!u.pathname.startsWith('/services/')) return null
    return raw
  } catch {
    return null
  }
}

function botConfig(): { token: string; channel: string } | null {
  const token = process.env.BEACON_SLACK_BOT_TOKEN?.trim()
  const channel = process.env.BEACON_SLACK_CHANNEL?.trim()
  if (!token || !channel) return null
  if (!token.startsWith('xoxb-') && !token.startsWith('xoxp-')) return null
  if (channel.length < 2 || channel.length > 80) return null
  return { token, channel }
}

export function isSlackConfigured(): boolean {
  return Boolean(webhookUrl() || botConfig())
}

export function slackConfigMode(): 'webhook' | 'bot' | null {
  if (webhookUrl()) return 'webhook'
  if (botConfig()) return 'bot'
  return null
}

function buildBlocks(input: SlackMessageInput): Record<string, unknown>[] {
  const blocks: Record<string, unknown>[] = []
  if (input.title) {
    blocks.push({
      type: 'header',
      text: { type: 'plain_text', text: input.title.slice(0, 150), emoji: true },
    })
  }
  blocks.push({
    type: 'section',
    text: { type: 'mrkdwn', text: input.text.slice(0, 2900) },
  })
  if (input.fields?.length) {
    blocks.push({
      type: 'section',
      fields: input.fields.slice(0, 10).map((f) => ({
        type: 'mrkdwn',
        text: `*${f.label}*\n${f.value.slice(0, 200)}`,
      })),
    })
  }
  if (input.link?.url) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: input.link.label.slice(0, 75), emoji: true },
          url: input.link.url,
        },
      ],
    })
  }
  return blocks
}

export async function publishSlack(input: SlackMessageInput): Promise<SlackPublishResult> {
  const hook = webhookUrl()
  if (hook) {
    return postWebhook(hook, input)
  }
  const bot = botConfig()
  if (bot) {
    return postBot(bot, input)
  }
  return { ok: false, skipped: true, error: 'Slack not configured' }
}

async function postWebhook(
  url: string,
  input: SlackMessageInput
): Promise<SlackPublishResult> {
  const username = process.env.BEACON_SLACK_USERNAME?.trim() || 'Beacon'
  const payload = {
    text: input.title ? `${input.title}\n${input.text}` : input.text,
    username,
    blocks: buildBlocks(input),
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        skipped: false,
        mode: 'webhook',
        error: `Slack webhook HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`,
      }
    }
    return { ok: true, skipped: false, mode: 'webhook' }
  } catch (e) {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(e, { surface: 'slack-webhook' })
    return {
      ok: false,
      skipped: false,
      mode: 'webhook',
      error: e instanceof Error ? e.message : 'Slack webhook failed',
    }
  }
}

async function postBot(
  bot: { token: string; channel: string },
  input: SlackMessageInput
): Promise<SlackPublishResult> {
  const payload = {
    channel: bot.channel,
    text: input.title ? `${input.title}\n${input.text}` : input.text,
    blocks: buildBlocks(input),
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${bot.token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    clearTimeout(timer)

    const json = (await res.json().catch(() => null)) as {
      ok?: boolean
      error?: string
    } | null

    if (!res.ok || !json?.ok) {
      return {
        ok: false,
        skipped: false,
        mode: 'bot',
        error: `Slack API ${json?.error || `HTTP ${res.status}`}`,
      }
    }
    return { ok: true, skipped: false, mode: 'bot' }
  } catch (e) {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(e, { surface: 'slack-bot' })
    return {
      ok: false,
      skipped: false,
      mode: 'bot',
      error: e instanceof Error ? e.message : 'Slack bot post failed',
    }
  }
}

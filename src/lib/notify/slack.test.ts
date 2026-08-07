import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSlackConfigured, publishSlack, slackConfigMode } from './slack'

describe('slack config', () => {
  afterEach(() => {
    delete process.env.BEACON_SLACK_WEBHOOK_URL
    delete process.env.BEACON_SLACK_BOT_TOKEN
    delete process.env.BEACON_SLACK_CHANNEL
    vi.unstubAllGlobals()
  })

  it('is off when unset', () => {
    expect(isSlackConfigured()).toBe(false)
    expect(slackConfigMode()).toBeNull()
  })

  it('accepts Slack incoming webhooks only', () => {
    process.env.BEACON_SLACK_WEBHOOK_URL =
      'https://hooks.slack.com/services/T00/B00/xxx'
    expect(isSlackConfigured()).toBe(true)
    expect(slackConfigMode()).toBe('webhook')
  })

  it('rejects non-Slack webhook hosts (SSRF guard)', () => {
    process.env.BEACON_SLACK_WEBHOOK_URL = 'https://evil.example/services/x'
    expect(isSlackConfigured()).toBe(false)
  })

  it('accepts bot token + channel', () => {
    process.env.BEACON_SLACK_BOT_TOKEN = 'xoxb-test-token'
    process.env.BEACON_SLACK_CHANNEL = '#office'
    expect(isSlackConfigured()).toBe(true)
    expect(slackConfigMode()).toBe('bot')
  })

  it('skips publish when not configured', async () => {
    const r = await publishSlack({ text: 'hi' })
    expect(r.ok).toBe(false)
    expect(r.skipped).toBe(true)
  })

  it('posts to webhook when configured', async () => {
    process.env.BEACON_SLACK_WEBHOOK_URL =
      'https://hooks.slack.com/services/T00/B00/xxx'
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => 'ok',
    })
    vi.stubGlobal('fetch', fetchMock)

    const r = await publishSlack({
      title: 'Beacon test',
      text: 'Hello office',
      fields: [{ label: 'School', value: 'Lighthouse' }],
    })
    expect(r.ok).toBe(true)
    expect(r.mode).toBe('webhook')
    expect(fetchMock).toHaveBeenCalledOnce()
    const body = JSON.parse(String(fetchMock.mock.calls[0]![1]!.body))
    expect(body.blocks.length).toBeGreaterThan(0)
  })
})

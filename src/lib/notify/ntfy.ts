/**
 * ntfy.sh (or self-hosted) push for product-owner pilot alerts.
 * Production-safe: timeouts, no secret leakage, soft-fail.
 *
 * Config (any of):
 *   BEACON_NTFY_URL=https://ntfy.sh/your-secret-topic
 *   BEACON_NTFY_SERVER=https://ntfy.sh + BEACON_NTFY_TOPIC=your-secret-topic
 * Optional:
 *   BEACON_NTFY_TOKEN=tk_…   (if topic requires auth)
 *   BEACON_NTFY_PRIORITY=default|high|urgent  (default high for pilot)
 */

export type NtfyPublishInput = {
  title: string
  message: string
  /** Optional click URL */
  click?: string | null
  tags?: string[]
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent'
}

export type NtfyPublishResult = {
  ok: boolean
  skipped: boolean
  error?: string
  endpoint?: string // host only, no topic secrets in full form if sensitive
}

export function resolveNtfyEndpoint(): {
  url: string
  token: string | null
} | null {
  const token = process.env.BEACON_NTFY_TOKEN?.trim() || null
  const full = process.env.BEACON_NTFY_URL?.trim()
  if (full) {
    try {
      // Validate URL
      new URL(full)
      return { url: full.replace(/\/$/, ''), token }
    } catch {
      return null
    }
  }
  const server = (process.env.BEACON_NTFY_SERVER?.trim() || 'https://ntfy.sh').replace(
    /\/$/,
    ''
  )
  const topic = process.env.BEACON_NTFY_TOPIC?.trim()
  if (!topic) return null
  if (!/^[a-zA-Z0-9_-]{4,128}$/.test(topic)) return null
  return { url: `${server}/${topic}`, token }
}

export function isNtfyConfigured(): boolean {
  return Boolean(resolveNtfyEndpoint())
}

export async function publishNtfy(
  input: NtfyPublishInput
): Promise<NtfyPublishResult> {
  const ep = resolveNtfyEndpoint()
  if (!ep) {
    return { ok: false, skipped: true, error: 'ntfy not configured' }
  }

  const priorityMap: Record<string, string> = {
    min: '1',
    low: '2',
    default: '3',
    high: '4',
    urgent: '5',
  }
  const p =
    input.priority ||
    (process.env.BEACON_NTFY_PRIORITY?.trim() as NtfyPublishInput['priority']) ||
    'high'

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    const headers: Record<string, string> = {
      Title: input.title.slice(0, 250),
      Priority: priorityMap[p] || '4',
      'Content-Type': 'text/plain; charset=utf-8',
    }
    if (input.tags?.length) headers.Tags = input.tags.slice(0, 8).join(',')
    if (input.click) headers.Click = input.click
    if (ep.token) headers.Authorization = `Bearer ${ep.token}`

    const res = await fetch(ep.url, {
      method: 'POST',
      headers,
      body: input.message.slice(0, 4000),
      signal: controller.signal,
    })
    clearTimeout(timer)

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      return {
        ok: false,
        skipped: false,
        error: `ntfy HTTP ${res.status}${text ? `: ${text.slice(0, 120)}` : ''}`,
        endpoint: safeHost(ep.url),
      }
    }
    return { ok: true, skipped: false, endpoint: safeHost(ep.url) }
  } catch (e) {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(e, { surface: 'ntfy' })
    return {
      ok: false,
      skipped: false,
      error: e instanceof Error ? e.message : 'ntfy publish failed',
      endpoint: safeHost(ep.url),
    }
  }
}

function safeHost(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return 'ntfy'
  }
}

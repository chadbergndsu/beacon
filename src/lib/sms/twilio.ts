/**
 * Optional Twilio SMS for parent aftercare alerts.
 * Soft-fail when not configured (same pattern as ntfy).
 *
 * Env:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM   (+1… or messaging service SID MGxxx)
 */

export type SmsSendResult = {
  ok: boolean
  skipped: boolean
  error?: string
  providerId?: string
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID?.trim() &&
      process.env.TWILIO_AUTH_TOKEN?.trim() &&
      process.env.TWILIO_FROM?.trim()
  )
}

/** Normalize to E.164-ish digits; keep leading + if present. */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length < 10 || digits.length > 15) return null
  // US 10-digit → +1
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return hasPlus || digits.length > 10 ? `+${digits}` : `+${digits}`
}

export async function sendSms(input: {
  to: string
  body: string
}): Promise<SmsSendResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const token = process.env.TWILIO_AUTH_TOKEN?.trim()
  const from = process.env.TWILIO_FROM?.trim()
  if (!sid || !token || !from) {
    return { ok: false, skipped: true, error: 'SMS not configured (TWILIO_* env).' }
  }

  const to = normalizePhone(input.to)
  if (!to) {
    return { ok: false, skipped: true, error: 'Invalid phone number.' }
  }

  const body = input.body.trim().slice(0, 320)
  if (!body) {
    return { ok: false, skipped: true, error: 'Empty SMS body.' }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`
  const auth = Buffer.from(`${sid}:${token}`).toString('base64')
  const form = new URLSearchParams()
  form.set('To', to)
  form.set('Body', body)
  if (from.startsWith('MG')) {
    form.set('MessagingServiceSid', from)
  } else {
    form.set('From', from)
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12_000)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
      signal: controller.signal,
    })
    clearTimeout(timer)

    const data = (await res.json().catch(() => ({}))) as {
      sid?: string
      message?: string
      error_message?: string
    }

    if (!res.ok) {
      return {
        ok: false,
        skipped: false,
        error: data.message || data.error_message || `Twilio HTTP ${res.status}`,
      }
    }
    return { ok: true, skipped: false, providerId: data.sid }
  } catch (e) {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(e, { surface: 'twilio-sms' })
    return {
      ok: false,
      skipped: false,
      error: e instanceof Error ? e.message : 'SMS send failed',
    }
  }
}

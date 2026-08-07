import 'server-only'
import { isEmailHonestLive } from '@/lib/email/transport'
import { resolveFeedbackOwnerEmail } from '@/lib/pilot-feedback/owner'
import { createAdminClient } from '@/lib/supabase/admin'

const READY_TTL_MS = 60_000
const NOT_READY_TTL_MS = 15_000
const PROBE_TIMEOUT_MS = 1_500

let cachedProbe: { value: boolean; expiresAt: number } | null = null
let inFlightProbe: Promise<boolean> | null = null

async function runLimiterProbe(): Promise<boolean> {
  try {
    const admin = createAdminClient()
    let timeout: ReturnType<typeof setTimeout> | undefined
    const result = await Promise.race([
      admin.rpc('public_inquiry_rate_limit_ready'),
      new Promise<null>((resolve) => {
        timeout = setTimeout(() => resolve(null), PROBE_TIMEOUT_MS)
      }),
    ])
    if (timeout) clearTimeout(timeout)
    return Boolean(result && !result.error && result.data === true)
  } catch {
    return false
  }
}

export async function publicInquiryLimiterReady(): Promise<boolean> {
  const now = Date.now()
  if (cachedProbe && cachedProbe.expiresAt > now) return cachedProbe.value
  if (inFlightProbe) return inFlightProbe

  inFlightProbe = runLimiterProbe().then((value) => {
    cachedProbe = {
      value,
      expiresAt: Date.now() + (value ? READY_TTL_MS : NOT_READY_TTL_MS),
    }
    return value
  }).finally(() => {
    inFlightProbe = null
  })
  return inFlightProbe
}

export async function isDesignPartnerInquiryReady(): Promise<boolean> {
  if (!resolveFeedbackOwnerEmail() || !isEmailHonestLive()) return false
  return publicInquiryLimiterReady()
}

export function resetInquiryReadinessCacheForTests(): void {
  if (process.env.NODE_ENV === 'test') {
    cachedProbe = null
    inFlightProbe = null
  }
}

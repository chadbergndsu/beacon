'use server'

import { headers } from 'next/headers'
import { queueAndSendEmail } from '@/lib/email/send'
import { isEmailHonestLive } from '@/lib/email/transport'
import { designPartnerInquirySchema } from '@/lib/marketing/design-partner'
import {
  buildInquiryRateLimits,
  consumeEphemeralInquiryLimits,
  resolveTrustedClientIp,
} from '@/lib/marketing/inquiry-limits'
import { resolveFeedbackOwnerEmail } from '@/lib/pilot-feedback/owner'
import { rateLimitAsync } from '@/lib/security/rate-limit'
import { createAdminClient } from '@/lib/supabase/admin'

export type DesignPartnerInquiryState = {
  ok?: boolean
  error?: string
}

export async function submitDesignPartnerInquiry(
  _previous: DesignPartnerInquiryState,
  formData: FormData
): Promise<DesignPartnerInquiryState> {
  const parsed = designPartnerInquirySchema.safeParse({
    name: formData.get('name'),
    role: formData.get('role'),
    email: formData.get('email'),
    school: formData.get('school'),
    enrollment: formData.get('enrollment') || undefined,
    currentSystems: formData.get('currentSystems') || undefined,
    priority: formData.get('priority'),
    website: formData.get('website') || undefined,
  })

  if (!parsed.success) {
    return { error: 'Check the required fields and keep the description under 1,200 characters.' }
  }

  // Honeypot: acknowledge quietly so automated submitters do not learn the filter.
  if (parsed.data.website) return { ok: true }

  const ownerEmail = resolveFeedbackOwnerEmail()
  if (!ownerEmail || !isEmailHonestLive()) {
    return { error: 'Design-partner inquiries are temporarily unavailable on this deployment.' }
  }

  const requestHeaders = await headers()
  const limits = buildInquiryRateLimits({
    ip: resolveTrustedClientIp(requestHeaders),
    email: parsed.data.email,
  })
  if (!(await consumeEphemeralInquiryLimits(limits, rateLimitAsync))) {
    return { error: 'Too many inquiry attempts. Please wait before trying again.' }
  }

  // The database check is atomic across serverless instances. Fail closed if
  // the durable boundary is unavailable rather than sending an unbounded email.
  let durableAllowed: unknown = false
  let durableError: unknown = null
  try {
    const admin = createAdminClient()
    const result = await admin.rpc('consume_public_inquiry_rate_limits', {
      p_keys: limits.map((limit) => limit.key),
      p_limits: limits.map((limit) => limit.limit),
      p_window_seconds: limits[0].windowMs / 1000,
    })
    durableAllowed = result.data
    durableError = result.error
  } catch (error) {
    durableError = error
  }
  if (durableError || durableAllowed !== true) {
    return {
      error: durableError
        ? 'Design-partner inquiries are temporarily unavailable on this deployment.'
        : 'Too many inquiry attempts. Please wait before trying again.',
    }
  }

  const lines = [
    `Name: ${parsed.data.name}`,
    `Role: ${parsed.data.role}`,
    `Email: ${parsed.data.email}`,
    `School: ${parsed.data.school}`,
    `Approximate enrollment: ${parsed.data.enrollment || 'Not provided'}`,
    `Current system(s): ${parsed.data.currentSystems || 'Not provided'}`,
    '',
    'Workflow to improve:',
    parsed.data.priority,
    '',
    'Public design-partner inquiry. Do not request or reply with student information.',
  ]

  try {
    const result = await queueAndSendEmail({
      school_id: null,
      kind: 'pilot_feedback',
      to_email: ownerEmail,
      subject: `Beacon design-partner inquiry · ${parsed.data.school}`,
      body_text: lines.join('\n'),
      reply_to: parsed.data.email,
      meta: { surface: 'public_design_partner_inquiry' },
    })

    if (result.status !== 'sent') {
      return { error: 'Your inquiry could not be delivered. Please try again later.' }
    }
    return { ok: true }
  } catch (error) {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(error, { surface: 'public_design_partner_inquiry' })
    return { error: 'Your inquiry could not be delivered. Please try again later.' }
  }
}

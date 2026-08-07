'use server'

import { deliverSchoolInquiry } from '@/lib/marketing/notify-inquiry'
import { validateSchoolInquiry } from '@/lib/marketing/school-inquiry'
import { rateLimitAsync } from '@/lib/security/rate-limit'
import { headers } from 'next/headers'

export type InquiryResult = { ok: true; note: string } | { ok: false; error: string }

/**
 * Public school inquiry — no auth. Honeypot + rate limit. Routes to product owner.
 */
export async function submitSchoolInquiry(input: {
  schoolName: string
  contactName: string
  email: string
  role: string
  message: string
  phone?: string
  /** Honeypot — must stay empty */
  company?: string
}): Promise<InquiryResult> {
  const validated = validateSchoolInquiry(input)
  if (!validated.ok) {
    // Honeypot: look like success
    if (validated.honeypot) {
      return { ok: true, note: validated.error }
    }
    return { ok: false, error: validated.error }
  }

  const h = await headers()
  const ip =
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  const rl = await rateLimitAsync({
    key: `school-inquiry:${ip}`,
    limit: 5,
    windowMs: 60 * 60 * 1000,
  })
  if (!rl.ok) {
    return { ok: false, error: 'Too many messages from this network. Try again later.' }
  }

  return deliverSchoolInquiry({
    schoolName: validated.data.schoolName,
    contactName: validated.data.contactName,
    email: validated.data.email,
    role: validated.data.role,
    message: validated.data.message,
    phone: validated.data.phone,
  })
}

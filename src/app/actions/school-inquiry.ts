'use server'

import { deliverSchoolInquiry } from '@/lib/marketing/notify-inquiry'
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
  // Bot trap
  if (input.company && input.company.trim()) {
    return { ok: true, note: 'Thanks — we received your note.' }
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

  const schoolName = input.schoolName?.trim() || ''
  const contactName = input.contactName?.trim() || ''
  const email = input.email?.trim().toLowerCase() || ''
  const role = input.role?.trim() || 'School leader'
  const message = input.message?.trim() || ''
  const phone = input.phone?.trim() || ''

  if (schoolName.length < 2 || schoolName.length > 120) {
    return { ok: false, error: 'Please include your school name.' }
  }
  if (contactName.length < 2 || contactName.length > 80) {
    return { ok: false, error: 'Please include your name.' }
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) {
    return { ok: false, error: 'Please use a valid work email.' }
  }
  if (message.length < 10 || message.length > 4000) {
    return { ok: false, error: 'Tell us a bit more (at least a sentence).' }
  }
  if (phone.length > 40) {
    return { ok: false, error: 'Phone looks too long.' }
  }

  return deliverSchoolInquiry({
    schoolName,
    contactName,
    email,
    role: role.slice(0, 80),
    message,
    phone: phone || undefined,
  })
}

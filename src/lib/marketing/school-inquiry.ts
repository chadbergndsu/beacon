/**
 * Pure validation for public school inquiry — unit-tested without Next/server.
 */
export type SchoolInquiryFields = {
  schoolName: string
  contactName: string
  email: string
  role: string
  message: string
  phone?: string
  company?: string
}

export function validateSchoolInquiry(
  input: SchoolInquiryFields
): { ok: true; data: SchoolInquiryFields } | { ok: false; error: string; honeypot?: true } {
  // Bot trap — pretend success so scrapers learn nothing
  if (input.company && input.company.trim()) {
    return { ok: false, error: 'Thanks — we received your note.', honeypot: true }
  }

  const schoolName = input.schoolName?.trim() || ''
  const contactName = input.contactName?.trim() || ''
  const email = input.email?.trim().toLowerCase() || ''
  const role = (input.role?.trim() || 'School leader').slice(0, 80)
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

  return {
    ok: true,
    data: {
      schoolName,
      contactName,
      email,
      role,
      message,
      phone: phone || undefined,
    },
  }
}

/**
 * Pure rules for freeform system email (leadership compose).
 * Prefer known school profiles; otherwise same domain as existing school members.
 */
export function freeformEmailAllowed(
  toEmail: string,
  schoolMemberEmails: (string | null | undefined)[]
): { ok: true } | { ok: false; reason: string } {
  const to = toEmail.trim().toLowerCase()
  if (!to.includes('@') || to.length > 200) {
    return { ok: false, reason: 'Valid email required.' }
  }

  const known = schoolMemberEmails.some(
    (e) => String(e || '').trim().toLowerCase() === to
  )
  if (known) return { ok: true }

  const domain = to.split('@')[1] || ''
  const schoolDomains = new Set(
    schoolMemberEmails
      .map((e) => String(e || '').split('@')[1]?.toLowerCase())
      .filter((d): d is string => Boolean(d))
  )
  if (!domain || !schoolDomains.has(domain)) {
    return {
      ok: false,
      reason:
        'Freeform mail only to known school profiles or the same email domain as school members.',
    }
  }
  return { ok: true }
}

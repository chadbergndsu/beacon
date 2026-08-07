/**
 * Pilot suggestions go to the product owner (you), not the principal.
 * Principal can still read them in-app; primary delivery is email to this address.
 *
 * Set on Vercel Production:
 *   BEACON_FEEDBACK_TO=you@yourdomain.com
 * Optional alias:
 *   BEACON_OWNER_EMAIL=you@yourdomain.com
 */

export function resolveFeedbackOwnerEmail(): string | null {
  let raw =
    process.env.BEACON_FEEDBACK_TO?.trim() ||
    process.env.BEACON_OWNER_EMAIL?.trim() ||
    ''
  if (!raw) return null
  // Strip wrapping quotes from Vercel / .env paste
  if (
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
  ) {
    raw = raw.slice(1, -1).trim()
  }
  // Allow "Name <email@x.com>" or bare email
  const angle = raw.match(/<([^>]+)>/)
  const email = (angle?.[1] || raw).trim().toLowerCase()
  if (/[\u0000-\u001f\u007f?&#,%]/.test(email)) return null
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  // Never treat demo domains as a real owner inbox
  if (email.endsWith('.test') || email.endsWith('.example') || email.endsWith('.invalid')) {
    return null
  }
  return email
}

export function feedbackOwnerConfigured(): boolean {
  return Boolean(resolveFeedbackOwnerEmail())
}

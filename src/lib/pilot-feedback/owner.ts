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
  const raw =
    process.env.BEACON_FEEDBACK_TO?.trim() ||
    process.env.BEACON_OWNER_EMAIL?.trim() ||
    ''
  if (!raw) return null
  // Allow "Name <email@x.com>" or bare email
  const angle = raw.match(/<([^>]+)>/)
  const email = (angle?.[1] || raw).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  return email
}

export function feedbackOwnerConfigured(): boolean {
  return Boolean(resolveFeedbackOwnerEmail())
}

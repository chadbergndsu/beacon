/**
 * Pilot suggestions + school inquiries go to the product owner (you), not the principal.
 * Principal can still read suggestions in-app; primary delivery is email to this address.
 *
 * Set on Vercel Production + Preview:
 *   BEACON_FEEDBACK_TO=office@commoncentsip.com
 *   (or your personal inbox — Chad, use whatever you actually read)
 * Optional alias:
 *   BEACON_OWNER_EMAIL=…
 *
 * If unset, falls back to the public Beacon office address so About / landing
 * contact forms never silently drop leads.
 */

/** Public product inbox — also used as mailto: on marketing pages */
export const DEFAULT_FEEDBACK_OWNER_EMAIL = 'office@commoncentsip.com'

export function resolveFeedbackOwnerEmail(): string | null {
  let raw =
    process.env.BEACON_FEEDBACK_TO?.trim() ||
    process.env.BEACON_OWNER_EMAIL?.trim() ||
    DEFAULT_FEEDBACK_OWNER_EMAIL
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

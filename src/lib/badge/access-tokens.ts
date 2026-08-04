/**
 * Kiosk / device token TTL helpers (pure — unit tested).
 * Default 90 days; override with BEACON_ACCESS_TOKEN_TTL_DAYS.
 */

export function getAccessTokenTtlDays(): number {
  const raw = process.env.BEACON_ACCESS_TOKEN_TTL_DAYS?.trim()
  const n = raw ? Number(raw) : 90
  if (!Number.isFinite(n) || n < 1) return 90
  return Math.min(Math.floor(n), 3650) // cap ~10 years
}

export function nextAccessTokenExpiryIso(nowMs = Date.now()): string {
  const days = getAccessTokenTtlDays()
  return new Date(nowMs + days * 86_400_000).toISOString()
}

/** Missing or unparseable expiry → treat as expired (fail closed after migration 018). */
export function isAccessTokenExpired(
  expiresAt: string | null | undefined,
  nowMs = Date.now()
): boolean {
  if (expiresAt == null || String(expiresAt).trim() === '') return true
  const t = Date.parse(String(expiresAt))
  if (!Number.isFinite(t)) return true
  return t <= nowMs
}

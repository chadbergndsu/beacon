/** Short badge codes for QR / barcode scanners (keyboard-wedge friendly). */

const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ' // no 0/O/1/I

export function generateBadgeCode(length = 6): string {
  const n = Math.max(4, Math.min(10, length))
  let out = ''
  const buf = new Uint32Array(n)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(buf)
  } else {
    for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 0xffffffff)
  }
  for (let i = 0; i < n; i++) {
    out += ALPHABET[buf[i]! % ALPHABET.length]
  }
  return out
}

/** Secret token for wall-mounted ESP32 / RFID readers posting to the device API. */
export function generateDeviceToken(): string {
  return `dev_${generateBadgeCode(8)}${generateBadgeCode(8)}`
}

/**
 * Normalize RFID / NFC / badge scanner input to a lookup key.
 * Accepts:
 * - plain badge: ABC123
 * - RFID hex with colons/spaces: A1:B2:C3:D4 → A1B2C3D4
 * - payload: BEACON|schoolSlug|ABC123
 * - URL ending with code
 * - leading zeros preserved after hex strip
 */
export function parseScannerInput(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed)
      const q =
        u.searchParams.get('code') ||
        u.searchParams.get('badge') ||
        u.searchParams.get('rfid') ||
        u.searchParams.get('uid')
      if (q) return normalizeCode(q)
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length) return normalizeCode(parts[parts.length - 1]!)
    }
  } catch {
    // not a URL
  }

  let s = trimmed
  if (s.includes('|')) {
    const parts = s.split('|')
    s = parts[parts.length - 1] || s
  }
  return normalizeCode(s)
}

/** Uppercase alphanumeric only — works for short badges and long RFID UIDs. */
export function normalizeCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 40)
}

/** Heuristic: long hex-ish strings look like RFID/NFC UIDs. */
export function looksLikeRfidUid(code: string): boolean {
  const c = normalizeCode(code)
  if (c.length < 8) return false
  // Mostly hex digits
  const hex = (c.match(/[0-9A-F]/g) || []).length
  return hex / c.length >= 0.85
}

export function badgePayload(schoolSlug: string, code: string): string {
  return `BEACON|${schoolSlug}|${code}`
}

export function computeAftercareAmountCents(
  minutes: number,
  rateCentsPerHour: number
): number {
  if (minutes <= 0 || rateCentsPerHour <= 0) return 0
  // bill in 15-minute increments, minimum 15 minutes once checked out
  const billedMinutes = Math.max(15, Math.ceil(minutes / 15) * 15)
  return Math.round((billedMinutes / 60) * rateCentsPerHour)
}

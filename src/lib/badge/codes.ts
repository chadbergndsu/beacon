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

/**
 * Accept raw scanner input:
 * - plain code: ABC123
 * - payload: BEACON|schoolSlug|ABC123
 * - URL ending with code
 */
export function parseScannerInput(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  // Prefer query param before uppercasing destroys nothing meaningful
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      const u = new URL(trimmed)
      const q = u.searchParams.get('code') || u.searchParams.get('badge')
      if (q) return q.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      const parts = u.pathname.split('/').filter(Boolean)
      if (parts.length) {
        return parts[parts.length - 1]!.toUpperCase().replace(/[^A-Z0-9]/g, '')
      }
    }
  } catch {
    // not a URL
  }

  let s = trimmed.toUpperCase()
  if (s.includes('|')) {
    const parts = s.split('|')
    s = parts[parts.length - 1] || s
  }
  return s.replace(/[^A-Z0-9]/g, '')
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

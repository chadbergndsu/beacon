/** Legacy external twin — optional override (see docs/adr/001-campus-twin-scan-presence.md). */
export const BEACONCRAFT_EXTERNAL_URL = 'https://beaconcraft.vercel.app'

/** Old Beacon default when craft wasn't running — treat as unset (see .env.example). */
const LEGACY_LOCAL_PLACEHOLDER = 'http://localhost:3001'

function normalizeBase(raw: string | undefined): string | null {
  const trimmed = raw?.trim().replace(/\/$/, '')
  if (!trimmed || trimmed === LEGACY_LOCAL_PLACEHOLDER) {
    return null
  }
  return trimmed
}

/**
 * Public base URL for campus twin links when hosted separately.
 * Returns empty string when unset — use integrated `/craft` on the same Beacon host.
 */
export function beaconCraftBaseUrl(): string {
  return normalizeBase(process.env.NEXT_PUBLIC_BEACONCRAFT_URL) ?? ''
}

/** Path or URL for the staff digital twin (same-origin `/craft` by default). */
export function beaconCraftAppHref(): string {
  const base = beaconCraftBaseUrl()
  return base ? base : '/craft'
}

/** Path or URL for the public campus tour. */
export function beaconCraftTourUrl(): string {
  const base = beaconCraftBaseUrl()
  if (!base) return '/craft/tour'
  return `${base}/?tour=1`
}

export function isExternalCraftUrl(href: string): boolean {
  return href.startsWith('http://') || href.startsWith('https://')
}

/** @deprecated use BEACONCRAFT_EXTERNAL_URL */
export const BEACONCRAFT_PRODUCTION_URL = BEACONCRAFT_EXTERNAL_URL

/** Production twin — separate deploy (see docs/adr/001-campus-twin-scan-presence.md). */
export const BEACONCRAFT_PRODUCTION_URL = 'https://beaconcraft.vercel.app'

/** Old Beacon default when craft wasn't running — treat as unset (see .env.example). */
const LEGACY_LOCAL_PLACEHOLDER = 'http://localhost:3001'

function normalizeBase(raw: string | undefined): string {
  const trimmed = raw?.trim().replace(/\/$/, '')
  if (!trimmed || trimmed === LEGACY_LOCAL_PLACEHOLDER) {
    return BEACONCRAFT_PRODUCTION_URL
  }
  return trimmed
}

/**
 * Public base URL for campus twin links (login, school site, tour).
 * Override with NEXT_PUBLIC_BEACONCRAFT_URL when running BeaconCraft locally.
 */
export function beaconCraftBaseUrl(): string {
  return normalizeBase(process.env.NEXT_PUBLIC_BEACONCRAFT_URL)
}

export function beaconCraftTourUrl(): string {
  return `${beaconCraftBaseUrl()}/?tour=1`
}

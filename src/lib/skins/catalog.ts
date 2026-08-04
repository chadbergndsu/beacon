/**
 * Beacon visual skins — every signed-in user can pick a favorite.
 * Applied via data-skin on <html> and CSS variables in globals.css.
 */

export type SkinId =
  | 'classic'
  | 'cartoon'
  | 'sports'
  | 'midnight'
  | 'ocean'
  | 'forest'
  | 'sunrise'
  | 'campus'
  | 'chalk'
  | 'neon'

export type SkinDef = {
  id: SkinId
  label: string
  tagline: string
  /** Preview swatches for the picker */
  swatches: [string, string, string]
  /** Header gradient hint (CSS) */
  headerFrom: string
  headerTo: string
}

export const SKIN_COOKIE = 'beacon_skin'
export const SKIN_STORAGE_KEY = 'beacon.skin'
export const DEFAULT_SKIN: SkinId = 'classic'

export const SKINS: SkinDef[] = [
  {
    id: 'classic',
    label: 'Classic',
    tagline: 'Beacon navy & sky — clean school suite',
    swatches: ['#0a1628', '#0284c7', '#f4f7fb'],
    headerFrom: '#0a1628',
    headerTo: '#0c4a6e',
  },
  {
    id: 'cartoon',
    label: 'Cartoon',
    tagline: 'Bright, bouncy, kid-friendly pops of color',
    swatches: ['#7c3aed', '#f472b6', '#fef08a'],
    headerFrom: '#6d28d9',
    headerTo: '#db2777',
  },
  {
    id: 'sports',
    label: 'Sports',
    tagline: 'Field green energy — game day vibe',
    swatches: ['#14532d', '#22c55e', '#fefce8'],
    headerFrom: '#14532d',
    headerTo: '#15803d',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    tagline: 'Deep purple night mode for late grade entry',
    swatches: ['#0f0720', '#a78bfa', '#1e1035'],
    headerFrom: '#0f0720',
    headerTo: '#4c1d95',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    tagline: 'Teal waves and calm coastal blues',
    swatches: ['#0c4a5e', '#14b8a6', '#ecfeff'],
    headerFrom: '#0c4a5e',
    headerTo: '#0f766e',
  },
  {
    id: 'forest',
    label: 'Forest',
    tagline: 'Moss, pine, and warm wood tones',
    swatches: ['#1a2e1a', '#65a30d', '#f7fee7'],
    headerFrom: '#1a2e1a',
    headerTo: '#3f6212',
  },
  {
    id: 'sunrise',
    label: 'Sunrise',
    tagline: 'Warm coral dawn — optimistic mornings',
    swatches: ['#9a3412', '#f97316', '#fff7ed'],
    headerFrom: '#9a3412',
    headerTo: '#ea580c',
  },
  {
    id: 'campus',
    label: 'Campus',
    tagline: 'Brick red & cream — traditional academy',
    swatches: ['#7f1d1d', '#b91c1c', '#faf5f0'],
    headerFrom: '#7f1d1d',
    headerTo: '#991b1b',
  },
  {
    id: 'chalk',
    label: 'Chalk',
    tagline: 'Blackboard green with chalk dust cream',
    swatches: ['#1a2f23', '#84cc16', '#f4f1e8'],
    headerFrom: '#1a2f23',
    headerTo: '#365314',
  },
  {
    id: 'neon',
    label: 'Neon',
    tagline: 'Electric lime & magenta on ink black',
    swatches: ['#050505', '#d946ef', '#a3e635'],
    headerFrom: '#050505',
    headerTo: '#3b0764',
  },
]

export function isSkinId(v: unknown): v is SkinId {
  return typeof v === 'string' && SKINS.some((s) => s.id === v)
}

export function parseSkinId(v: unknown): SkinId {
  return isSkinId(v) ? v : DEFAULT_SKIN
}

export function getSkin(id: SkinId | string | null | undefined): SkinDef {
  const parsed = parseSkinId(id)
  return SKINS.find((s) => s.id === parsed) || SKINS[0]!
}

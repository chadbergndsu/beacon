import { CRAFT_DEMO_ROOM_IDS } from './demo-ids'
import type { CraftPersonLook } from './types'

/**
 * Lighthouse Christian Academy — real staff on the twin.
 * Kids stay anonymized / fictional on public surfaces; teachers are named.
 *
 * Enrollment ballpark ~110, heavier in lower grades.
 */
export const LIGHTHOUSE_ENROLLMENT_TOTAL = 110

export const LIGHTHOUSE_ENROLLMENT_BY_ROOM: Record<string, number> = {
  [CRAFT_DEMO_ROOM_IDS.room101]: 24, // 1st — Leigh Evans
  [CRAFT_DEMO_ROOM_IDS.room102]: 26, // 2–3 — Debbie
  [CRAFT_DEMO_ROOM_IDS.room103]: 24, // 4–5 — Jen Berg
  'craft-demo-room-201': 14, // middle — John Lynn
  'craft-demo-room-202': 12, // middle / HS — Lexie Lynn
  'craft-demo-room-203': 10, // HS — Frank
}

export type LighthouseStaffDef = {
  staffId: string
  name: string
  roomId: string
  /** Short grade / role hint for HUD */
  title: string
  look: CraftPersonLook
}

export const LIGHTHOUSE_STAFF: LighthouseStaffDef[] = [
  {
    staffId: 'leigh-evans',
    name: 'Leigh Evans',
    roomId: CRAFT_DEMO_ROOM_IDS.room101,
    title: '1st grade',
    look: {
      hair: '#3f2a1d',
      skin: '#e8b896',
      shirt: '#2563eb',
      pants: '#1e3a5f',
      scale: 1,
      roleLabel: 'teacher',
    },
  },
  {
    staffId: 'debbie',
    name: 'Debbie',
    roomId: CRAFT_DEMO_ROOM_IDS.room102,
    title: 'Grades 2–3',
    look: {
      hair: '#6b4423',
      skin: '#e2b089',
      shirt: '#0d9488',
      pants: '#134e4a',
      scale: 1,
      roleLabel: 'teacher',
    },
  },
  {
    staffId: 'jen-berg',
    name: 'Jen Berg',
    roomId: CRAFT_DEMO_ROOM_IDS.room103,
    title: 'Grades 4–5',
    look: {
      // Blond + standout (kid request)
      hair: '#f5d76e',
      skin: '#f3c6a8',
      shirt: '#db2777',
      pants: '#9d174d',
      scale: 1.05,
      roleLabel: 'teacher',
    },
  },
  {
    staffId: 'john-lynn',
    name: 'John Lynn',
    roomId: 'craft-demo-room-201',
    title: 'Middle / HS',
    look: {
      hair: '#1c1917',
      skin: '#d4a574',
      shirt: '#1d4ed8',
      pants: '#172554',
      scale: 1.08,
      roleLabel: 'teacher',
    },
  },
  {
    staffId: 'lexie-lynn',
    name: 'Lexie Lynn',
    roomId: 'craft-demo-room-202',
    title: 'Middle / HS',
    look: {
      hair: '#92400e',
      skin: '#e8b896',
      shirt: '#7c3aed',
      pants: '#4c1d95',
      scale: 1,
      roleLabel: 'teacher',
    },
  },
  {
    staffId: 'frank',
    name: 'Frank',
    roomId: 'craft-demo-room-203',
    title: 'High school',
    look: {
      hair: '#44403c',
      skin: '#c9956c',
      shirt: '#334155',
      pants: '#0f172a',
      scale: 1.06,
      roleLabel: 'teacher',
    },
  },
  {
    staffId: 'marian',
    name: 'Marian',
    roomId: CRAFT_DEMO_ROOM_IDS.office,
    title: 'Secretary',
    look: {
      hair: '#78716c',
      skin: '#e2b089',
      shirt: '#f8fafc',
      pants: '#475569',
      scale: 1,
      roleLabel: 'secretary',
    },
  },
  {
    staffId: 'chris-cowan',
    name: 'Chris Cowan',
    roomId: 'craft-demo-room-204',
    title: 'Principal',
    look: {
      hair: '#292524',
      skin: '#d4a574',
      shirt: '#0f172a',
      pants: '#020617',
      // Bigger than everyone else (kid request)
      scale: 1.45,
      roleLabel: 'principal',
    },
  },
]

export function lighthouseEnrollmentByRoom(
  dbCounts: Record<string, number> = {}
): Record<string, number> {
  const out: Record<string, number> = { ...LIGHTHOUSE_ENROLLMENT_BY_ROOM }
  for (const [roomId, n] of Object.entries(dbCounts)) {
    if (typeof n === 'number' && n > 0) out[roomId] = n
  }
  return out
}

export function enrollmentTotal(byRoom: Record<string, number>): number {
  return Object.values(byRoom).reduce((a, b) => a + b, 0)
}

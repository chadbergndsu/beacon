import { CRAFT_DEMO_ROOM_IDS } from './demo-ids'
import type { CraftVisibleMarker } from './types'

/** Privacy-first demo markers for the public campus tour (no real student names). */
export const TOUR_DEMO_MARKERS: CraftVisibleMarker[] = [
  {
    id: 'tour-guest-1',
    label: 'Guest student',
    roomId: CRAFT_DEMO_ROOM_IDS.room101,
    since: new Date().toISOString(),
    anonymized: true,
  },
  {
    id: 'tour-guest-2',
    label: 'Guest student',
    roomId: CRAFT_DEMO_ROOM_IDS.room102,
    since: new Date().toISOString(),
    anonymized: true,
  },
  {
    id: 'tour-visitor',
    label: 'Visitor',
    roomId: CRAFT_DEMO_ROOM_IDS.hall,
    since: new Date().toISOString(),
    anonymized: true,
  },
]

import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { CRAFT_DEMO_ROOM_IDS } from '@/lib/craft/demo-ids'
import { isExternalCraftUrl, resolveCraftRoomId } from './campus-twin'

describe('resolveCraftRoomId', () => {
  const prev = process.env.BEACONCRAFT_ROOM_MAP

  beforeEach(() => {
    delete process.env.BEACONCRAFT_ROOM_MAP
  })

  afterEach(() => {
    if (prev === undefined) delete process.env.BEACONCRAFT_ROOM_MAP
    else process.env.BEACONCRAFT_ROOM_MAP = prev
  })

  it('maps explicit env uuid', () => {
    process.env.BEACONCRAFT_ROOM_MAP = JSON.stringify({
      '11111111-1111-1111-1111-111111111111': CRAFT_DEMO_ROOM_IDS.room101,
    })
    expect(resolveCraftRoomId('11111111-1111-1111-1111-111111111111', 'Anything')).toBe(
      CRAFT_DEMO_ROOM_IDS.room101
    )
  })

  it('heuristics from room name for integrated layout', () => {
    expect(resolveCraftRoomId('x', 'Classroom 101')).toBe(CRAFT_DEMO_ROOM_IDS.room101)
    expect(resolveCraftRoomId('x', 'Main Gym')).toBe(CRAFT_DEMO_ROOM_IDS.gym)
    expect(resolveCraftRoomId('x', 'Front Office')).toBe(CRAFT_DEMO_ROOM_IDS.office)
  })

  it('returns null when unknown', () => {
    expect(resolveCraftRoomId('x', 'Mystery Closet')).toBeNull()
  })
})

describe('isExternalCraftUrl', () => {
  it('treats empty and relative as integrated', () => {
    expect(isExternalCraftUrl(null)).toBe(false)
    expect(isExternalCraftUrl('/craft')).toBe(false)
  })

  it('treats legacy vercel twin as external', () => {
    expect(isExternalCraftUrl('https://beaconcraft.vercel.app')).toBe(true)
  })
})

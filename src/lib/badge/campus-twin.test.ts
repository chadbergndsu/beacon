import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { resolveCraftRoomId } from './campus-twin'

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
      '11111111-1111-1111-1111-111111111111': 'room-a101',
    })
    expect(resolveCraftRoomId('11111111-1111-1111-1111-111111111111', 'Anything')).toBe(
      'room-a101'
    )
  })

  it('heuristics from room name', () => {
    expect(resolveCraftRoomId('x', 'Classroom A101')).toBe('room-a101')
    expect(resolveCraftRoomId('x', 'Main Gym')).toBe('room-gym')
    expect(resolveCraftRoomId('x', 'Chapel')).toBe('room-chapel')
  })

  it('returns null when unknown', () => {
    expect(resolveCraftRoomId('x', 'Mystery Closet')).toBeNull()
  })
})

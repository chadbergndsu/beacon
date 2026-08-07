import { describe, expect, it } from 'vitest'
import { resolvePlayerCollision } from './collision'
import type { CraftAabb } from './geometry'

const wall: CraftAabb = { minX: 10, maxX: 10.3, minY: 0, maxY: 4, minZ: 0, maxZ: 10 }

describe('resolvePlayerCollision', () => {
  it('blocks movement into a wall', () => {
    const prev = { x: 9.5, z: 5 }
    const next = { x: 10.2, z: 5 }
    const resolved = resolvePlayerCollision(prev, next, [wall])
    expect(resolved.x).toBe(prev.x)
  })

  it('allows movement parallel to wall', () => {
    const prev = { x: 9.5, z: 5 }
    const next = { x: 9.5, z: 6.2 }
    const resolved = resolvePlayerCollision(prev, next, [wall])
    expect(resolved.z).toBe(next.z)
  })
})

import type { CraftAabb } from './geometry'

const PLAYER_RADIUS = 0.38

function overlaps(a: CraftAabb, px: number, pz: number, r: number): boolean {
  return (
    px + r > a.minX &&
    px - r < a.maxX &&
    pz + r > a.minZ &&
    pz - r < a.maxZ
  )
}

/** Slide collision against wall AABBs (XZ plane). */
export function resolvePlayerCollision(
  prev: { x: number; z: number },
  next: { x: number; z: number },
  boxes: CraftAabb[]
): { x: number; z: number } {
  let x = next.x
  let z = next.z

  for (const box of boxes) {
    if (!overlaps(box, x, z, PLAYER_RADIUS)) continue

    const overlapX = Math.min(x + PLAYER_RADIUS - box.minX, box.maxX - (x - PLAYER_RADIUS))
    const overlapZ = Math.min(z + PLAYER_RADIUS - box.minZ, box.maxZ - (z - PLAYER_RADIUS))

    if (overlapX < overlapZ) {
      x = prev.x
    } else {
      z = prev.z
    }
  }

  return { x, z }
}

export function clampToBounds(
  x: number,
  z: number,
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  pad = 0.5
): { x: number; z: number } {
  return {
    x: Math.min(Math.max(x, bounds.minX + pad), bounds.maxX - pad),
    z: Math.min(Math.max(z, bounds.minZ + pad), bounds.maxZ - pad),
  }
}

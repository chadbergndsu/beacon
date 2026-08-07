'use client'

import { useMemo } from 'react'
import type { CraftFloorLayout, CraftRoomDef } from '@/lib/craft/types'

type WallSegment = {
  key: string
  position: [number, number, number]
  size: [number, number, number]
  color: string
}

function pushWall(
  out: WallSegment[],
  key: string,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  color: string
) {
  out.push({
    key,
    position: [x + w / 2, y + h / 2, z + d / 2],
    size: [w, h, d],
    color,
  })
}

function wallsForRoom(room: CraftRoomDef): WallSegment[] {
  const [ox, oy, oz] = room.origin
  const [w, h, d] = room.size
  const t = 0.25
  const wallColor = '#64748b'
  const segments: WallSegment[] = []

  // North wall (-Z) with center door gap for hall-facing rooms
  const doorGap = Math.min(3, w * 0.35)
  const gapStart = ox + (w - doorGap) / 2
  pushWall(segments, `${room.roomId}-n-l`, ox, oy, oz, gapStart - ox, h, t, wallColor)
  pushWall(
    segments,
    `${room.roomId}-n-r`,
    gapStart + doorGap,
    oy,
    oz,
    ox + w - (gapStart + doorGap),
    h,
    t,
    wallColor
  )

  // South wall (+Z)
  pushWall(segments, `${room.roomId}-s`, ox, oy, oz + d - t, w, h, t, wallColor)
  // West wall (-X)
  pushWall(segments, `${room.roomId}-w`, ox, oy, oz, t, h, d, wallColor)
  // East wall (+X)
  pushWall(segments, `${room.roomId}-e`, ox + w - t, oy, oz, t, h, d, wallColor)

  return segments
}

export function VoxelSchool({ layout }: { layout: CraftFloorLayout }) {
  const { floors, walls } = useMemo(() => {
    const floorMeshes: { key: string; position: [number, number, number]; size: [number, number, number]; color: string }[] = []
    const wallMeshes: WallSegment[] = []

    for (const room of layout.rooms) {
      const [ox, oy, oz] = room.origin
      const [w, , d] = room.size
      floorMeshes.push({
        key: `${room.roomId}-floor`,
        position: [ox + w / 2, oy + 0.05, oz + d / 2],
        size: [w, 0.1, d],
        color: room.color,
      })
      wallMeshes.push(...wallsForRoom(room))
    }

    return { floors: floorMeshes, walls: wallMeshes }
  }, [layout])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[24, -0.02, 20]} receiveShadow>
        <planeGeometry args={[64, 64]} />
        <meshStandardMaterial color="#94a3b8" />
      </mesh>
      {floors.map((f) => (
        <mesh key={f.key} position={f.position} castShadow receiveShadow>
          <boxGeometry args={f.size} />
          <meshStandardMaterial color={f.color} />
        </mesh>
      ))}
      {walls.map((w) => (
        <mesh key={w.key} position={w.position} castShadow receiveShadow>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color={w.color} />
        </mesh>
      ))}
    </group>
  )
}

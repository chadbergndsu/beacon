'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { getRoomById, getRoomCenter } from '@/lib/craft/layout'
import type { CraftVisibleMarker } from '@/lib/craft/types'
import { useCraftUi } from './CraftUiContext'

function PresenceAvatar({
  marker,
  position,
}: {
  marker: CraftVisibleMarker
  position: [number, number, number]
}) {
  const group = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const color = marker.anonymized ? '#94a3b8' : '#22c55e'
  const emissive = marker.anonymized ? '#64748b' : '#16a34a'

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    if (group.current) {
      group.current.position.y = position[1] + Math.sin(t * 2.2 + position[0]) * 0.06
    }
    if (ring.current) {
      ring.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08)
      ;(ring.current.material as THREE.MeshStandardMaterial).opacity = 0.35 + Math.sin(t * 3) * 0.12
    }
  })

  return (
    <group ref={group} position={position}>
      <mesh castShadow position={[0, 0.55, 0]}>
        <capsuleGeometry args={[0.22, 0.55, 4, 8]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.25} roughness={0.45} />
      </mesh>
      <mesh castShadow position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.2, 12, 12]} />
        <meshStandardMaterial color={color} emissive={emissive} emissiveIntensity={0.2} roughness={0.4} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
        <ringGeometry args={[0.35, 0.5, 24]} />
        <meshStandardMaterial color={color} transparent opacity={0.4} emissive={emissive} emissiveIntensity={0.5} />
      </mesh>
      <Html center distanceFactor={11} style={{ pointerEvents: 'none' }}>
        <div className="rounded-full border border-white/20 bg-black/65 px-2 py-0.5 text-[9px] font-medium text-white whitespace-nowrap shadow-lg backdrop-blur-sm">
          {marker.label}
        </div>
      </Html>
    </group>
  )
}

export function RoomLabels() {
  const { layout } = useCraftUi()

  return (
    <>
      {layout.rooms.map((room) => {
        const [x, y, z] = getRoomCenter(room)
        return (
          <Html
            key={room.roomId}
            position={[x, y + room.size[1] * 0.72, z]}
            center
            distanceFactor={16}
            style={{ pointerEvents: 'none' }}
          >
            <div className="rounded-md border border-white/10 bg-slate-900/70 px-2 py-1 text-[10px] font-semibold tracking-wide text-white whitespace-nowrap shadow-md backdrop-blur-sm">
              {room.name}
            </div>
          </Html>
        )
      })}
    </>
  )
}

export function PresenceMarkers() {
  const { layout, markers } = useCraftUi()

  const positioned = (() => {
    const byRoom = new Map<string, CraftVisibleMarker[]>()
    for (const m of markers) {
      const list = byRoom.get(m.roomId) ?? []
      list.push(m)
      byRoom.set(m.roomId, list)
    }
    const out: { marker: CraftVisibleMarker; position: [number, number, number] }[] = []
    for (const [roomId, list] of byRoom.entries()) {
      const room = getRoomById(layout, roomId)
      if (!room) continue
      const [cx, cy, cz] = getRoomCenter(room)
      list.forEach((marker, i) => {
        const angle = (i / Math.max(list.length, 1)) * Math.PI * 2
        const radius = Math.min(2.2, room.size[0] * 0.22)
        out.push({
          marker,
          position: [cx + Math.cos(angle) * radius, cy + 0.05, cz + Math.sin(angle) * radius],
        })
      })
    }
    return out
  })()

  return (
    <>
      {positioned.map(({ marker, position }) => (
        <PresenceAvatar key={marker.id} marker={marker} position={position} />
      ))}
    </>
  )
}

export function OccupancyParticles() {
  const { layout, markers } = useCraftUi()
  const counts = new Map<string, number>()
  for (const m of markers) {
    counts.set(m.roomId, (counts.get(m.roomId) ?? 0) + 1)
  }

  return (
    <>
      {layout.rooms.map((room) => {
        const count = counts.get(room.roomId) ?? 0
        if (!count) return null
        const [cx, , cz] = getRoomCenter(room)
        return (
          <mesh key={`occ-${room.roomId}`} position={[cx, room.size[1] + 0.25, cz]}>
            <sphereGeometry args={[0.12 + count * 0.04, 12, 12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.85} />
          </mesh>
        )
      })}
    </>
  )
}

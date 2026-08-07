'use client'

import { useMemo } from 'react'
import { Html } from '@react-three/drei'
import { getRoomById, getRoomCenter } from '@/lib/craft/layout'
import { useCraftUi } from './CraftUiContext'

export function RoomLabels() {
  const { layout } = useCraftUi()

  return (
    <>
      {layout.rooms.map((room) => {
        const [x, y, z] = getRoomCenter(room)
        return (
          <Html
            key={room.roomId}
            position={[x, y + room.size[1] * 0.6, z]}
            center
            distanceFactor={14}
            style={{ pointerEvents: 'none' }}
          >
            <div className="rounded bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white whitespace-nowrap">
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

  const positioned = useMemo(() => {
    const byRoom = new Map<string, typeof markers>()
    for (const m of markers) {
      const list = byRoom.get(m.roomId) ?? []
      list.push(m)
      byRoom.set(m.roomId, list)
    }
    const out: { marker: (typeof markers)[number]; position: [number, number, number] }[] = []
    for (const [roomId, list] of byRoom.entries()) {
      const room = getRoomById(layout, roomId)
      if (!room) continue
      const [cx, cy, cz] = getRoomCenter(room)
      list.forEach((marker, i) => {
        const angle = (i / Math.max(list.length, 1)) * Math.PI * 2
        const radius = Math.min(2, room.size[0] * 0.2)
        out.push({
          marker,
          position: [cx + Math.cos(angle) * radius, cy + 0.8, cz + Math.sin(angle) * radius],
        })
      })
    }
    return out
  }, [layout, markers])

  return (
    <>
      {positioned.map(({ marker, position }) => (
        <group key={marker.id} position={position}>
          <mesh castShadow>
            <boxGeometry args={[0.5, 1.2, 0.5]} />
            <meshStandardMaterial color={marker.anonymized ? '#94a3b8' : '#22c55e'} />
          </mesh>
          <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
            <div className="rounded bg-emerald-900/80 px-1.5 py-0.5 text-[9px] text-white whitespace-nowrap">
              {marker.label}
            </div>
          </Html>
        </group>
      ))}
    </>
  )
}

export function OccupancyParticles() {
  const { layout, markers } = useCraftUi()
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const m of markers) {
      map.set(m.roomId, (map.get(m.roomId) ?? 0) + 1)
    }
    return map
  }, [markers])

  return (
    <>
      {layout.rooms.map((room) => {
        const count = counts.get(room.roomId) ?? 0
        if (!count) return null
        const [cx, , cz] = getRoomCenter(room)
        return (
          <mesh key={`occ-${room.roomId}`} position={[cx, room.size[1] + 0.3, cz]}>
            <sphereGeometry args={[0.15 + count * 0.05, 8, 8]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.6} />
          </mesh>
        )
      })}
    </>
  )
}

'use client'

import { Html } from '@react-three/drei'
import { getRoomById, getRoomCenter, getFloor } from '@/lib/craft/campus'
import type { CraftVisibleMarker } from '@/lib/craft/types'
import { useCraftUi } from './CraftUiContext'

/**
 * Kid-friendly low-poly people — no glowing capsules / blank sphere heads.
 * Olivia: “people to not look so creepy.”
 * Named staff looks: Jen Berg blond, Chris Cowan bigger, etc.
 */
function PresenceAvatar({
  marker,
  position,
}: {
  marker: CraftVisibleMarker
  position: [number, number, number]
}) {
  const isTeacher = marker.kind === 'teacher'
  const look = marker.look
  const scale = look?.scale && look.scale > 0 ? look.scale : 1
  const skin = marker.anonymized ? '#cbd5e1' : look?.skin || '#f2c4a0'
  const shirt = marker.anonymized
    ? '#94a3b8'
    : look?.shirt || (isTeacher ? '#1e3a5f' : '#3b82f6')
  const pants = marker.anonymized
    ? '#64748b'
    : look?.pants || (isTeacher ? '#0f172a' : '#1d4ed8')
  const hair = marker.anonymized
    ? '#94a3b8'
    : look?.hair || (isTeacher ? '#4b5563' : '#78350f')
  const roleHint = look?.roleLabel || (isTeacher ? 'teacher' : '')

  return (
    <group position={position} scale={scale}>
      {/* Soft ground shadow — no pulsing ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <circleGeometry args={[0.32, 20]} />
        <meshBasicMaterial color="#0f172a" transparent opacity={0.18} />
      </mesh>

      {/* Legs */}
      <mesh castShadow position={[-0.1, 0.28, 0]}>
        <boxGeometry args={[0.16, 0.5, 0.18]} />
        <meshStandardMaterial color={pants} roughness={0.85} />
      </mesh>
      <mesh castShadow position={[0.1, 0.28, 0]}>
        <boxGeometry args={[0.16, 0.5, 0.18]} />
        <meshStandardMaterial color={pants} roughness={0.85} />
      </mesh>

      {/* Torso */}
      <mesh castShadow position={[0, 0.72, 0]}>
        <boxGeometry args={[0.42, 0.48, 0.28]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>

      {/* Arms */}
      <mesh castShadow position={[-0.3, 0.7, 0]}>
        <boxGeometry args={[0.12, 0.4, 0.12]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>
      <mesh castShadow position={[0.3, 0.7, 0]}>
        <boxGeometry args={[0.12, 0.4, 0.12]} />
        <meshStandardMaterial color={shirt} roughness={0.8} />
      </mesh>

      {/* Head — rounded box, not blank sphere */}
      <mesh castShadow position={[0, 1.12, 0]}>
        <boxGeometry args={[0.28, 0.28, 0.28]} />
        <meshStandardMaterial color={skin} roughness={0.75} />
      </mesh>

      {/* Hair cap — longer blond volume for Jen Berg */}
      <mesh position={[0, 1.26, 0]}>
        <boxGeometry args={[0.32, look?.hair === '#f5d76e' ? 0.14 : 0.1, 0.32]} />
        <meshStandardMaterial color={hair} roughness={0.9} />
      </mesh>
      {look?.hair === '#f5d76e' ? (
        <mesh position={[0, 1.18, -0.12]}>
          <boxGeometry args={[0.28, 0.22, 0.12]} />
          <meshStandardMaterial color={hair} roughness={0.9} />
        </mesh>
      ) : null}

      {/* Simple face — eyes + smile */}
      <mesh position={[-0.07, 1.14, 0.15]}>
        <boxGeometry args={[0.05, 0.05, 0.02]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0.07, 1.14, 0.15]}>
        <boxGeometry args={[0.05, 0.05, 0.02]} />
        <meshBasicMaterial color="#1e293b" />
      </mesh>
      <mesh position={[0, 1.05, 0.15]}>
        <boxGeometry args={[0.1, 0.03, 0.02]} />
        <meshBasicMaterial color="#b45309" />
      </mesh>

      <Html center distanceFactor={12} style={{ pointerEvents: 'none' }}>
        <div
          className={
            isTeacher
              ? 'rounded-md border border-sky-200/80 bg-sky-50/95 px-2 py-0.5 text-[9px] font-semibold text-sky-950 whitespace-nowrap shadow-sm'
              : 'rounded-md border border-slate-200/80 bg-white/95 px-2 py-0.5 text-[9px] font-medium text-slate-800 whitespace-nowrap shadow-sm'
          }
        >
          {marker.label}
          {roleHint ? ` · ${roleHint}` : ''}
        </div>
      </Html>
    </group>
  )
}

export function RoomLabels() {
  const { layout, activeFloorId, enrollmentByRoom } = useCraftUi()
  const floor = getFloor(layout, activeFloorId)
  if (!floor) return null

  return (
    <>
      {floor.rooms.map((room) => {
        const [x, y, z] = getRoomCenter(layout, room)
        const enrolled = enrollmentByRoom[room.roomId]
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
              {typeof enrolled === 'number' ? (
                <span className="ml-1 font-normal text-sky-200/90">· {enrolled} enrolled</span>
              ) : null}
            </div>
          </Html>
        )
      })}
    </>
  )
}

export function PresenceMarkers() {
  const { layout, markers, activeFloorId } = useCraftUi()
  const floorRoomIds = new Set(getFloor(layout, activeFloorId)?.rooms.map((r) => r.roomId))
  const visible = markers.filter((m) => floorRoomIds.has(m.roomId))

  const positioned = (() => {
    const byRoom = new Map<string, CraftVisibleMarker[]>()
    for (const m of visible) {
      const list = byRoom.get(m.roomId) ?? []
      list.push(m)
      byRoom.set(m.roomId, list)
    }
    const out: { marker: CraftVisibleMarker; position: [number, number, number] }[] = []
    for (const [roomId, list] of byRoom.entries()) {
      const room = getRoomById(layout, roomId)
      if (!room) continue
      const [cx, cy, cz] = getRoomCenter(layout, room)
      const teachers = list.filter((m) => m.kind === 'teacher')
      const students = list.filter((m) => m.kind !== 'teacher')
      teachers.forEach((marker, i) => {
        out.push({
          marker,
          position: [cx + (i - (teachers.length - 1) / 2) * 0.7, cy + 0.05, cz - room.size[2] * 0.28],
        })
      })
      students.forEach((marker, i) => {
        const angle = (i / Math.max(students.length, 1)) * Math.PI * 2
        const radius = Math.min(2.0, room.size[0] * 0.2)
        out.push({
          marker,
          position: [cx + Math.cos(angle) * radius, cy + 0.05, cz + Math.sin(angle) * radius * 0.6],
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
  const { layout, markers, activeFloorId } = useCraftUi()
  const floor = getFloor(layout, activeFloorId)
  if (!floor) return null
  const counts = new Map<string, number>()
  const floorIds = new Set(floor.rooms.map((r) => r.roomId))
  for (const m of markers) {
    if (!floorIds.has(m.roomId)) continue
    if (m.kind === 'teacher') continue
    counts.set(m.roomId, (counts.get(m.roomId) ?? 0) + 1)
  }

  return (
    <>
      {floor.rooms.map((room) => {
        const count = counts.get(room.roomId) ?? 0
        if (!count) return null
        const [cx, , cz] = getRoomCenter(layout, room)
        return (
          <mesh key={`occ-${room.roomId}`} position={[cx, room.size[1] + 0.25, cz]}>
            <sphereGeometry args={[0.1 + count * 0.03, 12, 12]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.35} roughness={0.6} />
          </mesh>
        )
      })}
    </>
  )
}

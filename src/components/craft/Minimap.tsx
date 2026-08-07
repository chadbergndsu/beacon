'use client'

import { layoutBounds } from '@/lib/craft/campus'
import { getFloor, getRoomById } from '@/lib/craft/campus'
import { useCraftUi } from './CraftUiContext'

export function Minimap() {
  const {
    layout,
    player,
    markers,
    activeFloorId,
    highlightRoomId,
    highlightMarkerId,
  } = useCraftUi()
  const bounds = layoutBounds(layout, activeFloorId)
  const floorRooms = getFloor(layout, activeFloorId)?.rooms ?? []
  const width = bounds.maxX - bounds.minX || 1
  const height = bounds.maxZ - bounds.minZ || 1

  const toX = (x: number) => ((x - bounds.minX) / width) * 100
  const toY = (z: number) => ((z - bounds.minZ) / height) * 100
  const heading = (-player.yaw * 180) / Math.PI

  const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
  const compassIdx =
    Math.round(
      (((player.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)
    ) % 8

  return (
    <div className="pointer-events-none absolute right-3 top-14 w-28 rounded-xl border border-white/20 bg-slate-900/80 p-1.5 text-white shadow-xl backdrop-blur-md sm:bottom-4 sm:top-auto sm:w-40 sm:p-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-300">
          Campus map
        </p>
        <p className="text-[10px] font-bold text-sky-300">{compass[compassIdx]}</p>
      </div>
      <svg viewBox="0 0 100 100" className="h-20 w-full rounded-lg bg-slate-950/70 sm:h-32">
        {floorRooms.map((room) => {
          const [ox, , oz] = room.origin
          const [w, , d] = room.size
          const highlighted = room.roomId === highlightRoomId
          return (
            <rect
              key={room.roomId}
              x={toX(ox)}
              y={toY(oz)}
              width={(w / width) * 100}
              height={(d / height) * 100}
              fill={room.color}
              fillOpacity={highlighted ? 0.85 : 0.5}
              stroke={highlighted ? '#38bdf8' : '#e2e8f0'}
              strokeWidth={highlighted ? 1.1 : 0.35}
              rx={0.5}
            />
          )
        })}
        {markers.map((m) => {
          const room = getRoomById(layout, m.roomId)
          if (!room || !floorRooms.some((r) => r.roomId === m.roomId)) return null
          const cx = room.origin[0] + room.size[0] / 2
          const cz = room.origin[2] + room.size[2] / 2
          const selected = m.id === highlightMarkerId
          return (
            <circle
              key={m.id}
              cx={toX(cx)}
              cy={toY(cz)}
              r={selected ? 2.1 : 1.1}
              fill={selected ? '#fbbf24' : m.anonymized ? '#94a3b8' : '#4ade80'}
              stroke={selected ? '#f59e0b' : 'none'}
              strokeWidth={selected ? 0.6 : 0}
            />
          )
        })}
        <g transform={`rotate(${heading} ${toX(player.x)} ${toY(player.z)})`}>
          <polygon
            points={`${toX(player.x)},${toY(player.z) - 3} ${toX(player.x) - 1.8},${toY(player.z) + 1.6} ${toX(player.x) + 1.8},${toY(player.z) + 1.6}`}
            fill="#38bdf8"
            stroke="#0ea5e9"
            strokeWidth={0.5}
          />
        </g>
      </svg>
    </div>
  )
}

export function Crosshair() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <div className="relative h-6 w-6 opacity-70">
        <span className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 rounded-full bg-white/80" />
        <span className="absolute bottom-0 left-1/2 h-2 w-0.5 -translate-x-1/2 rounded-full bg-white/80" />
        <span className="absolute left-0 top-1/2 h-0.5 w-2 -translate-y-1/2 rounded-full bg-white/80" />
        <span className="absolute right-0 top-1/2 h-0.5 w-2 -translate-y-1/2 rounded-full bg-white/80" />
      </div>
    </div>
  )
}

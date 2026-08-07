'use client'

import { layoutBounds } from '@/lib/craft/layout'
import { useCraftUi } from './CraftUiContext'

export function Minimap() {
  const { layout, player, markers } = useCraftUi()
  const bounds = layoutBounds(layout)
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxZ - bounds.minZ

  const toX = (x: number) => ((x - bounds.minX) / width) * 100
  const toY = (z: number) => ((z - bounds.minZ) / height) * 100

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 w-40 rounded-lg border border-white/30 bg-slate-900/75 p-2 text-white shadow-lg backdrop-blur sm:w-48">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-300">Mini-map</p>
      <svg viewBox="0 0 100 100" className="h-28 w-full rounded bg-slate-950/60 sm:h-32">
        {layout.rooms.map((room) => {
          const [ox, , oz] = room.origin
          const [w, , d] = room.size
          return (
            <rect
              key={room.roomId}
              x={toX(ox)}
              y={toY(oz)}
              width={(w / width) * 100}
              height={(d / height) * 100}
              fill={room.color}
              fillOpacity={0.55}
              stroke="#cbd5e1"
              strokeWidth={0.4}
            />
          )
        })}
        {markers.map((m) => {
          const room = layout.rooms.find((r) => r.roomId === m.roomId)
          if (!room) return null
          const cx = room.origin[0] + room.size[0] / 2
          const cz = room.origin[2] + room.size[2] / 2
          return (
            <circle
              key={m.id}
              cx={toX(cx)}
              cy={toY(cz)}
              r={1.2}
              fill={m.anonymized ? '#94a3b8' : '#22c55e'}
            />
          )
        })}
        <circle cx={toX(player.x)} cy={toY(player.z)} r={1.8} fill="#38bdf8" stroke="#0ea5e9" strokeWidth={0.6} />
        <polygon
          points={`${toX(player.x)},${toY(player.z) - 2.5} ${toX(player.x) - 1.5},${toY(player.z) + 1.5} ${toX(player.x) + 1.5},${toY(player.z) + 1.5}`}
          fill="#38bdf8"
          opacity={0.5}
        />
      </svg>
    </div>
  )
}

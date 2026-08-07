'use client'

import { getFloor } from '@/lib/craft/campus'
import { useCraftUi } from './CraftUiContext'

export function FloorSwitcher() {
  const { layout, activeFloorId, switchFloor } = useCraftUi()

  if (layout.floors.length <= 1) return null

  return (
    <div className="absolute left-3 top-3 z-20 flex flex-wrap gap-1.5">
      {layout.floors.map((floor) => {
        const active = floor.floorId === activeFloorId
        return (
          <button
            key={floor.floorId}
            type="button"
            onClick={() => switchFloor(floor.floorId)}
            className={`rounded-full px-3 py-1 text-xs font-semibold shadow-md backdrop-blur-sm ${
              active
                ? 'bg-sky-600 text-white'
                : 'border border-white/20 bg-slate-900/60 text-slate-100 hover:bg-slate-800/80'
            }`}
          >
            {floor.name}
          </button>
        )
      })}
      <span className="self-center text-[10px] text-white/70">
        Elev {getFloor(layout, activeFloorId)?.elevationY ?? 0}m
      </span>
    </div>
  )
}

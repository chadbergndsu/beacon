'use client'

import Link from 'next/link'
import { useState } from 'react'
import { getRoomFloorId } from '@/lib/craft/campus'
import { useCraftUi } from './CraftUiContext'
import { FloorSwitcher } from './FloorSwitcher'
import { Minimap } from './Minimap'
import { PersonSearch, RoomSearch } from './CraftPanels'
import { TourVoxelScene } from './TourVoxelScene'

export function CraftTourHud({ markers }: { markers: { id: string; label: string; roomId: string; since: string; anonymized: boolean }[] }) {
  const { layout, requestTeleport, activeFloorId, switchFloor } = useCraftUi()
  const [toolsOpen, setToolsOpen] = useState(false)

  function focusPerson(marker: (typeof markers)[number]) {
    const floorId = getRoomFloorId(layout, marker.roomId)
    if (floorId && floorId !== activeFloorId) {
      switchFloor(floorId, marker.roomId)
    } else {
      requestTeleport(marker.roomId)
    }
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-950">
      <header className="z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-slate-900/95 px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{layout.name} · Campus tour</p>
          <p className="truncate text-[10px] text-slate-300">
            Public preview · drag to orbit · no login required
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 text-xs">
          <button
            type="button"
            className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-white sm:hidden"
            onClick={() => setToolsOpen((v) => !v)}
          >
            {toolsOpen ? 'Hide' : 'Search'}
          </button>
          <Link
            href="/login"
            className="rounded-full bg-sky-600 px-3 py-1 font-medium text-white hover:bg-sky-500"
          >
            Staff sign in
          </Link>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <TourVoxelScene />
        <FloorSwitcher />
        <Minimap />
        <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-3">
          <p className="rounded-full bg-black/55 px-3 py-1 text-[11px] text-white backdrop-blur-sm">
            Demo markers only · real badge presence after staff sign-in at{' '}
            <Link href="/craft" className="pointer-events-auto font-semibold underline">
              /craft
            </Link>
          </p>
        </div>
      </div>

      <div
        className={`z-20 grid gap-2 border-t border-white/10 bg-white/95 p-2 sm:grid-cols-2 sm:gap-3 sm:p-3 ${
          toolsOpen ? 'block' : 'hidden sm:grid'
        }`}
      >
        <PersonSearch markers={markers} onSelectPerson={focusPerson} />
        <RoomSearch layout={layout} onSelectRoom={requestTeleport} />
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Role } from '@/lib/types'
import type { CraftVisibleMarker } from '@/lib/craft/types'
import { roleLabel } from '@/lib/roles'
import { useCraftUi } from './CraftUiContext'
import { FloorSwitcher } from './FloorSwitcher'
import { Minimap, Crosshair } from './Minimap'
import { MockScanPanel, PersonSearch, RoomSearch } from './CraftPanels'
import { TouchMovePad } from './TouchMovePad'
import { TouchLookZone } from './TouchLookZone'
import { VoxelScene } from './VoxelScene'

export function CraftHud({
  role,
  canFly,
  canMockScan,
  markerCount,
  markers,
  schoolId,
  onRefresh,
}: {
  role: Role
  canFly: boolean
  canMockScan: boolean
  markerCount: number
  markers: CraftVisibleMarker[]
  schoolId: string
  onRefresh: () => void
}) {
  const {
    flyMode,
    setFlyMode,
    requestTeleport,
    layout,
    pointerLocked,
    setHighlightMarkerId,
    setFollowMarkerId,
  } = useCraftUi()
  const [toolsOpen, setToolsOpen] = useState(false)

  function focusPerson(marker: CraftVisibleMarker) {
    setHighlightMarkerId(marker.id)
    setFollowMarkerId(marker.id)
    requestTeleport(marker.roomId)
  }

  return (
    <div className="relative flex h-[calc(100dvh-4.5rem)] min-h-[360px] flex-col overflow-hidden rounded-xl border border-border bg-slate-950 shadow-inner sm:h-[calc(100dvh-8rem)] sm:min-h-[420px]">
      <div className="z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-slate-900/90 px-2 py-1.5 backdrop-blur sm:gap-3 sm:px-3 sm:py-2">
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold text-white sm:text-lg">BeaconCraft</h1>
          <p className="truncate text-[10px] text-slate-300 sm:text-xs">
            {layout.name} · {roleLabel(role)} · {markerCount} visible
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 text-xs sm:gap-2">
          {canFly ? (
            <label className="hidden items-center gap-1 rounded-full border border-white/15 bg-white/10 px-2 py-1 text-white sm:inline-flex">
              <input
                type="checkbox"
                checked={flyMode}
                onChange={(e) => setFlyMode(e.target.checked)}
              />
              Fly
            </label>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/15 sm:px-3"
          >
            Refresh
          </button>
          <button
            type="button"
            className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/15 sm:hidden"
            onClick={() => setToolsOpen((v) => !v)}
          >
            {toolsOpen ? 'Hide' : 'Search'}
          </button>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/15 bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/15 sm:px-3"
          >
            Exit
          </Link>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <VoxelScene />
        <Crosshair />
        <FloorSwitcher />
        {!pointerLocked ? (
          <div className="pointer-events-none absolute inset-x-0 top-12 flex justify-center px-3 sm:top-16">
            <div className="max-w-md rounded-lg bg-black/55 px-3 py-1.5 text-center text-[11px] text-white shadow-lg backdrop-blur-sm sm:text-sm">
              <span className="sm:hidden">Use move pad · drag look zone · Search · floors</span>
              <span className="hidden sm:inline">
                Click to look · WASD / arrows · Search · Floor 1 &amp; 2
              </span>
            </div>
          </div>
        ) : null}
        <Minimap />
        <TouchMovePad />
        <TouchLookZone />
      </div>

      <div
        className={`z-20 grid gap-2 border-t border-white/10 bg-white/95 p-2 sm:grid-cols-2 sm:gap-3 sm:p-3 ${
          toolsOpen ? 'block' : 'hidden sm:grid'
        }`}
      >
        <PersonSearch markers={markers} onSelectPerson={focusPerson} />
        <RoomSearch layout={layout} onSelectRoom={requestTeleport} />
        {canMockScan ? (
          <div className="sm:col-span-2">
            <MockScanPanel layout={layout} schoolId={schoolId} onScan={onRefresh} />
          </div>
        ) : null}
      </div>
    </div>
  )
}

export function MarkerLegend({ markers }: { markers: CraftVisibleMarker[] }) {
  if (!markers.length) {
    return <p className="text-xs text-muted-foreground">No visible presence markers yet.</p>
  }
  return (
    <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs">
      {markers.map((m) => (
        <li key={m.id} className="flex justify-between gap-2">
          <span>
            {m.label}
            {m.kind === 'teacher' ? (
              <span className="ml-1 text-[10px] text-sky-700">teacher</span>
            ) : null}
          </span>
          <span className="text-muted-foreground">{new Date(m.since).toLocaleTimeString()}</span>
        </li>
      ))}
    </ul>
  )
}

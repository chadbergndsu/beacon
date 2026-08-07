'use client'

import Link from 'next/link'
import type { Role } from '@/lib/types'
import type { CraftVisibleMarker } from '@/lib/craft/types'
import { roleLabel } from '@/lib/roles'
import { useCraftUi } from './CraftUiContext'
import { Minimap } from './Minimap'
import { MockScanPanel, RoomSearch } from './CraftPanels'
import { TouchMovePad } from './TouchMovePad'
import { VoxelScene } from './VoxelScene'

export function CraftHud({
  role,
  canFly,
  canMockScan,
  markerCount,
  onRefresh,
}: {
  role: Role
  canFly: boolean
  canMockScan: boolean
  markerCount: number
  onRefresh: () => void
}) {
  const { flyMode, setFlyMode, requestTeleport, layout, pointerLocked } = useCraftUi()

  return (
    <div className="relative flex h-[calc(100dvh-8rem)] min-h-[420px] flex-col overflow-hidden rounded-xl border border-border bg-slate-100 shadow-inner">
      <div className="z-10 flex flex-wrap items-start justify-between gap-3 border-b border-border/80 bg-white/90 px-3 py-2 backdrop-blur">
        <div>
          <h1 className="text-lg font-bold text-slate-900">BeaconCraft</h1>
          <p className="text-xs text-muted-foreground">
            {layout.name} · {roleLabel(role)} view · {markerCount} visible on campus
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {canFly ? (
            <label className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1">
              <input
                type="checkbox"
                checked={flyMode}
                onChange={(e) => setFlyMode(e.target.checked)}
              />
              Fly mode
            </label>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50"
          >
            Refresh presence
          </button>
          <Link href="/dashboard" className="rounded-full border border-slate-200 bg-white px-3 py-1 hover:bg-slate-50">
            Exit
          </Link>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <VoxelScene layout={layout} />
        {!pointerLocked ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="rounded-lg bg-black/50 px-4 py-2 text-sm text-white">
              Click the world to capture mouse · WASD move · Space/Shift fly (admin)
            </div>
          </div>
        ) : null}
        <Minimap />
        <TouchMovePad />
      </div>

      <div className="z-10 grid gap-3 border-t border-border/80 bg-white/95 p-3 sm:grid-cols-2">
        <RoomSearch layout={layout} onSelectRoom={requestTeleport} />
        {canMockScan ? <MockScanPanel layout={layout} onScan={onRefresh} /> : null}
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
          <span>{m.label}</span>
          <span className="text-muted-foreground">{new Date(m.since).toLocaleTimeString()}</span>
        </li>
      ))}
    </ul>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { TOUR_STOPS } from '@/lib/craft/tour-stops'
import { useCraftUi } from './CraftUiContext'
import { FloorSwitcher } from './FloorSwitcher'
import { Minimap } from './Minimap'
import { PersonSearch, RoomSearch } from './CraftPanels'
import { TourVoxelScene } from './TourVoxelScene'

export function CraftTourHud({
  markers,
}: {
  markers: { id: string; label: string; roomId: string; since: string; anonymized: boolean }[]
}) {
  const {
    layout,
    requestTeleport,
    setHighlightRoomId,
    setHighlightMarkerId,
  } = useCraftUi()
  const [toolsOpen, setToolsOpen] = useState(false)
  const [stopIndex, setStopIndex] = useState(0)
  const started = useRef(false)
  const stop = TOUR_STOPS[stopIndex]!

  function goToStop(next: number) {
    const idx = ((next % TOUR_STOPS.length) + TOUR_STOPS.length) % TOUR_STOPS.length
    const s = TOUR_STOPS[idx]!
    setStopIndex(idx)
    setHighlightRoomId(s.roomId)
    requestTeleport(s.roomId)
  }

  // Land on entrance stop once the canvas is up
  useEffect(() => {
    if (started.current) return
    started.current = true
    const t = window.setTimeout(() => goToStop(0), 250)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only guided start
  }, [])

  function focusPerson(marker: (typeof markers)[number]) {
    setHighlightMarkerId(marker.id)
    setHighlightRoomId(marker.roomId)
    requestTeleport(marker.roomId)
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-950">
      <header className="z-20 flex items-center justify-between gap-2 border-b border-white/10 bg-slate-900/95 px-3 py-2 backdrop-blur">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">{layout.name} · Campus tour</p>
          <p className="truncate text-[10px] text-slate-300">
            Public preview · guided stops or free orbit · no login required
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
          <div className="pointer-events-auto w-full max-w-lg rounded-xl border border-white/15 bg-black/70 px-3 py-2.5 text-white shadow-lg backdrop-blur-md">
            <div className="flex items-start gap-2">
              <button
                type="button"
                aria-label="Previous stop"
                className="mt-0.5 rounded-md border border-white/20 bg-white/10 p-1.5 hover:bg-white/20"
                onClick={() => goToStop(stopIndex - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-sky-300">
                  Stop {stopIndex + 1} of {TOUR_STOPS.length}
                </p>
                <p className="truncate text-sm font-semibold">{stop.title}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-200">{stop.blurb}</p>
              </div>
              <button
                type="button"
                aria-label="Next stop"
                className="mt-0.5 rounded-md border border-white/20 bg-white/10 p-1.5 hover:bg-white/20"
                onClick={() => goToStop(stopIndex + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-2 flex justify-center gap-1">
              {TOUR_STOPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={`Go to ${s.title}`}
                  aria-current={i === stopIndex}
                  className={`h-1.5 w-4 rounded-full transition ${
                    i === stopIndex ? 'bg-sky-400' : 'bg-white/25 hover:bg-white/40'
                  }`}
                  onClick={() => goToStop(i)}
                />
              ))}
            </div>
          </div>
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

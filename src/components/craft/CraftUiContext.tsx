'use client'

import { createContext, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildSchoolGeometry, type CraftSchoolGeometry } from '@/lib/craft/geometry'
import { getRoomCenter, getRoomById } from '@/lib/craft/layout'
import type { CraftFloorLayout, CraftTrailPoint, CraftVisibleMarker } from '@/lib/craft/types'

export type PlayerSnapshot = {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
}

export type TouchMove = { x: number; y: number }

type CraftUiContextValue = {
  layout: CraftFloorLayout
  geometry: CraftSchoolGeometry
  markers: CraftVisibleMarker[]
  trails: CraftTrailPoint[]
  player: PlayerSnapshot
  setPlayer: (p: PlayerSnapshot) => void
  flyMode: boolean
  setFlyMode: (v: boolean) => void
  teleportRoomId: string | null
  requestTeleport: (roomId: string | null) => void
  highlightRoomId: string | null
  setHighlightRoomId: (id: string | null) => void
  pointerLocked: boolean
  setPointerLocked: (v: boolean) => void
  touchMove: TouchMove
  setTouchMove: (v: TouchMove) => void
  touchLookRef: React.MutableRefObject<{ dx: number; dy: number }>
}

const CraftUiContext = createContext<CraftUiContextValue | null>(null)

function initialPlayer(layout: CraftFloorLayout): PlayerSnapshot {
  const entrance = getRoomById(layout, 'craft-demo-entrance') ?? layout.rooms[0]
  const [cx, cy, cz] = entrance ? getRoomCenter(entrance) : [24, 2, 26]
  return { x: cx, y: cy + 0.5, z: cz, yaw: 0, pitch: 0 }
}

export function CraftUiProvider({
  layout,
  markers,
  trails = [],
  flyMode,
  setFlyMode,
  children,
}: {
  layout: CraftFloorLayout
  markers: CraftVisibleMarker[]
  trails?: CraftTrailPoint[]
  flyMode: boolean
  setFlyMode: (v: boolean) => void
  children: ReactNode
}) {
  const geometry = useMemo(() => buildSchoolGeometry(layout), [layout])
  const [player, setPlayer] = useState<PlayerSnapshot>(() => initialPlayer(layout))
  const [teleportRoomId, setTeleportRoomId] = useState<string | null>(null)
  const [highlightRoomId, setHighlightRoomId] = useState<string | null>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
  const [touchMove, setTouchMove] = useState<TouchMove>({ x: 0, y: 0 })
  const touchLookRef = useRef({ dx: 0, dy: 0 })

  const value = useMemo(
    () => ({
      layout,
      geometry,
      markers,
      trails,
      player,
      setPlayer,
      flyMode,
      setFlyMode,
      teleportRoomId,
      requestTeleport: setTeleportRoomId,
      highlightRoomId,
      setHighlightRoomId,
      pointerLocked,
      setPointerLocked,
      touchMove,
      setTouchMove,
      touchLookRef,
    }),
    [
      layout,
      geometry,
      markers,
      trails,
      player,
      flyMode,
      setFlyMode,
      teleportRoomId,
      highlightRoomId,
      pointerLocked,
      touchMove,
    ]
  )

  return <CraftUiContext.Provider value={value}>{children}</CraftUiContext.Provider>
}

export function useCraftUi() {
  const ctx = useContext(CraftUiContext)
  if (!ctx) throw new Error('useCraftUi must be used within CraftUiProvider')
  return ctx
}

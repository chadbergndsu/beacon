'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CraftFloorLayout, CraftTrailPoint, CraftVisibleMarker } from '@/lib/craft/types'

export type PlayerSnapshot = {
  x: number
  y: number
  z: number
}

export type TouchMove = { x: number; y: number }

type CraftUiContextValue = {
  layout: CraftFloorLayout
  markers: CraftVisibleMarker[]
  trails: CraftTrailPoint[]
  player: PlayerSnapshot
  setPlayer: (p: PlayerSnapshot) => void
  flyMode: boolean
  setFlyMode: (v: boolean) => void
  teleportRoomId: string | null
  requestTeleport: (roomId: string | null) => void
  pointerLocked: boolean
  setPointerLocked: (v: boolean) => void
  touchMove: TouchMove
  setTouchMove: (v: TouchMove) => void
}

const CraftUiContext = createContext<CraftUiContextValue | null>(null)

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
  const [player, setPlayer] = useState<PlayerSnapshot>({ x: 24, y: 2, z: 26 })
  const [teleportRoomId, setTeleportRoomId] = useState<string | null>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
  const [touchMove, setTouchMove] = useState<TouchMove>({ x: 0, y: 0 })

  const value = useMemo(
    () => ({
      layout,
      markers,
      trails,
      player,
      setPlayer,
      flyMode,
      setFlyMode,
      teleportRoomId,
      requestTeleport: setTeleportRoomId,
      pointerLocked,
      setPointerLocked,
      touchMove,
      setTouchMove,
    }),
    [layout, markers, trails, player, flyMode, setFlyMode, teleportRoomId, pointerLocked, touchMove]
  )

  return <CraftUiContext.Provider value={value}>{children}</CraftUiContext.Provider>
}

export function useCraftUi() {
  const ctx = useContext(CraftUiContext)
  if (!ctx) throw new Error('useCraftUi must be used within CraftUiProvider')
  return ctx
}

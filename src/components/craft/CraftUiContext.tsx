'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { CraftFloorLayout, CraftVisibleMarker } from '@/lib/craft/types'

export type PlayerSnapshot = {
  x: number
  y: number
  z: number
}

type CraftUiContextValue = {
  layout: CraftFloorLayout
  markers: CraftVisibleMarker[]
  player: PlayerSnapshot
  setPlayer: (p: PlayerSnapshot) => void
  flyMode: boolean
  setFlyMode: (v: boolean) => void
  teleportRoomId: string | null
  requestTeleport: (roomId: string | null) => void
  pointerLocked: boolean
  setPointerLocked: (v: boolean) => void
}

const CraftUiContext = createContext<CraftUiContextValue | null>(null)

export function CraftUiProvider({
  layout,
  markers,
  flyMode,
  setFlyMode,
  children,
}: {
  layout: CraftFloorLayout
  markers: CraftVisibleMarker[]
  flyMode: boolean
  setFlyMode: (v: boolean) => void
  children: ReactNode
}) {
  const [player, setPlayer] = useState<PlayerSnapshot>({ x: 24, y: 2, z: 26 })
  const [teleportRoomId, setTeleportRoomId] = useState<string | null>(null)
  const [pointerLocked, setPointerLocked] = useState(false)

  const value = useMemo(
    () => ({
      layout,
      markers,
      player,
      setPlayer,
      flyMode,
      setFlyMode,
      teleportRoomId,
      requestTeleport: setTeleportRoomId,
      pointerLocked,
      setPointerLocked,
    }),
    [layout, markers, player, flyMode, setFlyMode, teleportRoomId, pointerLocked]
  )

  return <CraftUiContext.Provider value={value}>{children}</CraftUiContext.Provider>
}

export function useCraftUi() {
  const ctx = useContext(CraftUiContext)
  if (!ctx) throw new Error('useCraftUi must be used within CraftUiProvider')
  return ctx
}

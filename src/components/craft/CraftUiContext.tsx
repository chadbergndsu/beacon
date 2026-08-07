'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { buildSchoolGeometry, type CraftSchoolGeometry } from '@/lib/craft/geometry'
import {
  getDefaultFloorId,
  getFloor,
  getRoomById,
  getRoomCenter,
} from '@/lib/craft/campus'
import type { CraftCampusLayout, CraftTrailPoint, CraftVisibleMarker } from '@/lib/craft/types'

export type PlayerSnapshot = {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
}

export type TouchMove = { x: number; y: number }

type CraftUiContextValue = {
  layout: CraftCampusLayout
  geometry: CraftSchoolGeometry
  activeFloorId: string
  setActiveFloorId: (id: string) => void
  switchFloor: (floorId: string, roomId?: string | null) => void
  markers: CraftVisibleMarker[]
  trails: CraftTrailPoint[]
  /** Active enrollments per layout room (real counts; no names). */
  enrollmentByRoom: Record<string, number>
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

function initialPlayer(layout: CraftCampusLayout, floorId: string): PlayerSnapshot {
  const entrance = getRoomById(layout, 'craft-demo-entrance')
  const floor = getFloor(layout, floorId)
  const room = entrance ?? floor?.rooms[0]
  if (!room) return { x: 24, y: 2, z: 26, yaw: 0, pitch: 0 }
  const [cx, cy, cz] = getRoomCenter(layout, room)
  return { x: cx, y: cy + 0.5, z: cz, yaw: 0, pitch: 0 }
}

export function CraftUiProvider({
  layout,
  markers,
  trails = [],
  enrollmentByRoom = {},
  flyMode,
  setFlyMode,
  children,
}: {
  layout: CraftCampusLayout
  markers: CraftVisibleMarker[]
  trails?: CraftTrailPoint[]
  enrollmentByRoom?: Record<string, number>
  flyMode: boolean
  setFlyMode: (v: boolean) => void
  children: ReactNode
}) {
  const defaultFloor = getDefaultFloorId(layout)
  const [activeFloorId, setActiveFloorId] = useState(defaultFloor)
  const geometry = useMemo(
    () => buildSchoolGeometry(layout, activeFloorId),
    [layout, activeFloorId]
  )
  const [player, setPlayer] = useState<PlayerSnapshot>(() => initialPlayer(layout, defaultFloor))
  const [teleportRoomId, setTeleportRoomId] = useState<string | null>(null)
  const [highlightRoomId, setHighlightRoomId] = useState<string | null>(null)
  const [pointerLocked, setPointerLocked] = useState(false)
  const [touchMove, setTouchMove] = useState<TouchMove>({ x: 0, y: 0 })
  const touchLookRef = useRef({ dx: 0, dy: 0 })

  const switchFloor = useCallback(
    (floorId: string, roomId?: string | null) => {
      setActiveFloorId(floorId)
      const room = roomId ? getRoomById(layout, roomId) : getFloor(layout, floorId)?.rooms[0]
      if (room) {
        const [cx, cy, cz] = getRoomCenter(layout, room)
        setPlayer({ x: cx, y: cy + 0.5, z: cz, yaw: player.yaw, pitch: player.pitch })
      }
    },
    [layout, player.pitch, player.yaw]
  )

  const value = useMemo(
    () => ({
      layout,
      geometry,
      activeFloorId,
      setActiveFloorId,
      switchFloor,
      markers,
      trails,
      enrollmentByRoom,
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
      activeFloorId,
      switchFloor,
      markers,
      trails,
      enrollmentByRoom,
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

'use client'

import { useCraftUi } from './CraftUiContext'

export function TouchLookZone() {
  const { touchLookRef, pointerLocked } = useCraftUi()

  if (pointerLocked) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-10 sm:hidden">
      <div
        className="pointer-events-auto absolute bottom-14 right-2 top-14 w-[38%] max-w-[9rem] rounded-xl border border-white/10 bg-sky-900/10 backdrop-blur-[1px] sm:bottom-24 sm:right-3 sm:top-16 sm:w-[42%] sm:max-w-none"
        onTouchStart={(e) => e.stopPropagation()}
        onTouchMove={(e) => {
          e.preventDefault()
          const t = e.touches[0]
          if (!t) return
          const prev = (e.currentTarget as HTMLElement & { _last?: { x: number; y: number } })._last
          if (prev) {
            touchLookRef.current.dx += t.clientX - prev.x
            touchLookRef.current.dy += t.clientY - prev.y
          }
          ;(e.currentTarget as HTMLElement & { _last?: { x: number; y: number } })._last = {
            x: t.clientX,
            y: t.clientY,
          }
        }}
        onTouchEnd={(e) => {
          delete (e.currentTarget as HTMLElement & { _last?: { x: number; y: number } })._last
        }}
        aria-label="Look around"
      >
        <span className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-medium text-white/70">
          Drag to look
        </span>
      </div>
    </div>
  )
}

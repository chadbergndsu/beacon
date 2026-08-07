'use client'

import { useCraftUi } from './CraftUiContext'

export function TouchMovePad() {
  const { setTouchMove } = useCraftUi()

  function onMove(clientX: number, clientY: number, rect: DOMRect) {
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (clientX - cx) / (rect.width / 2)
    const dy = (clientY - cy) / (rect.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      setTouchMove({ x: dx / len, y: dy / len })
    } else if (len > 0.12) {
      setTouchMove({ x: dx, y: dy })
    } else {
      setTouchMove({ x: 0, y: 0 })
    }
  }

  return (
    <div className="pointer-events-none absolute bottom-16 left-3 z-20 sm:bottom-20 sm:hidden">
      <div
        className="pointer-events-auto h-24 w-24 rounded-full border border-white/40 bg-slate-900/35 backdrop-blur"
        onTouchStart={(e) => {
          const t = e.touches[0]
          if (!t) return
          onMove(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect())
        }}
        onTouchMove={(e) => {
          e.preventDefault()
          const t = e.touches[0]
          if (!t) return
          onMove(t.clientX, t.clientY, e.currentTarget.getBoundingClientRect())
        }}
        onTouchEnd={() => setTouchMove({ x: 0, y: 0 })}
        onTouchCancel={() => setTouchMove({ x: 0, y: 0 })}
        aria-label="Move pad"
      >
        <div className="flex h-full items-center justify-center text-[10px] font-semibold text-white/80">
          Move
        </div>
      </div>
    </div>
  )
}

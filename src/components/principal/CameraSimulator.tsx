'use client'

/**
 * EasyCamera LiveGrid-style simulator feed.
 * Used when streamKind === 'simulator' so principal can demo the wall
 * without go2rtc/MediaMTX online.
 * @see /Users/chadberg/easycamera/apps/web/src/components/LiveGrid.tsx
 */

import { useEffect, useRef } from 'react'
import type { SchoolCamera } from '@/lib/school-modules/types'
import { CAMERA_ZONE_LABEL } from '@/lib/school-modules/types'
import { cn } from '@/lib/utils'

export function CameraSimulator({
  camera,
  className,
}: {
  camera: SchoolCamera
  className?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    const start = performance.now()
    const w = canvas.width
    const h = canvas.height

    const draw = (t: number) => {
      const elapsed = (t - start) / 1000
      const g = ctx.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, `hsl(${(elapsed * 18 + camera.sortOrder * 40) % 360} 38% 16%)`)
      g.addColorStop(1, `hsl(${(elapsed * 18 + 90 + camera.sortOrder * 40) % 360} 32% 10%)`)
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      // scan line
      const y = (elapsed * 48) % h
      ctx.fillStyle = 'rgba(56,189,248,0.12)'
      ctx.fillRect(0, y, w, 6)

      // motion blob
      const bx = w * (0.35 + 0.25 * Math.sin(elapsed * (0.8 + camera.sortOrder * 0.1)))
      const by = h * (0.42 + 0.12 * Math.cos(elapsed * 1.2))
      ctx.beginPath()
      ctx.arc(bx, by, 26, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(251,191,36,0.32)'
      ctx.fill()

      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.font = '600 17px ui-sans-serif, system-ui, sans-serif'
      ctx.fillText(camera.name, 14, 28)
      ctx.font = '11px ui-monospace, monospace'
      ctx.fillStyle = 'rgba(148,163,184,0.95)'
      ctx.fillText('SIMULATOR · EasyCamera pattern', 14, 48)
      ctx.fillText(CAMERA_ZONE_LABEL[camera.zone], 14, h - 36)
      ctx.fillText(new Date().toLocaleTimeString(), 14, h - 16)

      // LIVE pill
      ctx.fillStyle = 'rgba(16,185,129,0.85)'
      ctx.fillRect(w - 58, 12, 46, 18)
      ctx.fillStyle = '#042f2e'
      ctx.font = '700 10px ui-sans-serif, system-ui'
      ctx.fillText('LIVE', w - 46, 25)

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [camera])

  return (
    <canvas
      ref={canvasRef}
      width={960}
      height={540}
      className={cn('aspect-video w-full bg-black', className)}
      aria-label={`Simulator feed: ${camera.name}`}
    />
  )
}

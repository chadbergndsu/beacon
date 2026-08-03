'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const W = 360
const H = 220
const TRACK_Y = H / 2

type KartState = {
  x: number
  y: number
  vx: number
  score: number
  best: number
  alive: boolean
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem('beacon-principal-kart-hi') || '0') || 0
  } catch {
    return 0
  }
}

function saveBest(n: number) {
  try {
    localStorage.setItem('beacon-principal-kart-hi', String(n))
  } catch {
    /* ignore */
  }
}

/**
 * Principal-only go-kart — auto-starts, A / ← left, D / → right.
 * Controls skill: A moves left, D moves right (not inverted).
 */
export function PrincipalKart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const keysRef = useRef({ left: false, right: false })
  const stateRef = useRef<KartState>({
    x: 40,
    y: TRACK_Y,
    vx: 2.4,
    score: 0,
    best: 0,
    alive: true,
  })
  const obstaclesRef = useRef<{ x: number; y: number; w: number; h: number }[]>(
    Array.from({ length: 5 }, (_, i) => ({
      x: 180 + i * 140,
      y: 40 + ((i * 37) % (H - 80)),
      w: 18,
      h: 28 + ((i * 11) % 20),
    }))
  )
  const rafRef = useRef<number>(0)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => loadBest())
  const [alive, setAlive] = useState(true)

  const reset = useCallback(() => {
    const b = loadBest()
    stateRef.current = {
      x: 40,
      y: TRACK_Y,
      vx: 2.4,
      score: 0,
      best: b,
      alive: true,
    }
    obstaclesRef.current = Array.from({ length: 5 }, (_, i) => ({
      x: 180 + i * 140,
      y: 40 + Math.random() * (H - 80),
      w: 18,
      h: 28 + Math.random() * 20,
    }))
    setScore(0)
    setBest(b)
    setAlive(true)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'a' || k === 'arrowleft') {
        e.preventDefault()
        keysRef.current.left = e.type === 'keydown'
      }
      if (k === 'd' || k === 'arrowright') {
        e.preventDefault()
        keysRef.current.right = e.type === 'keydown'
      }
      if (k === 'r' && !stateRef.current.alive) {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [reset])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let last = performance.now()

    const tick = (now: number) => {
      const dt = Math.min(32, now - last) / 16.67
      last = now
      const s = stateRef.current

      if (s.alive) {
        // A / left = move up on track (visual left relative to forward motion),
        // D / right = move down — standard top-down: left key reduces y? 
        // User feedback: controls felt backwards. Correct mapping:
        // A / ←  → steer left (decrease y toward top of screen)
        // D / →  → steer right (increase y toward bottom)
        if (keysRef.current.left) s.y -= 3.2 * dt
        if (keysRef.current.right) s.y += 3.2 * dt
        s.y = Math.max(28, Math.min(H - 28, s.y))

        s.x += s.vx * dt
        s.score += s.vx * 0.15 * dt
        s.vx = Math.min(6.5, s.vx + 0.0015 * dt)

        for (const o of obstaclesRef.current) {
          o.x -= s.vx * dt
          if (o.x < -40) {
            o.x = W + 40 + Math.random() * 120
            o.y = 40 + Math.random() * (H - 80)
            o.h = 28 + Math.random() * 20
          }
          // collision
          if (
            s.x + 14 > o.x &&
            s.x - 10 < o.x + o.w &&
            s.y + 8 > o.y &&
            s.y - 8 < o.y + o.h
          ) {
            s.alive = false
            const rounded = Math.floor(s.score)
            if (rounded > s.best) {
              s.best = rounded
              saveBest(rounded)
            }
            setAlive(false)
            setBest(s.best)
          }
        }

        // wrap world so kart stays near left third of screen
        if (s.x > 120) {
          const shift = s.x - 120
          s.x = 120
          for (const o of obstaclesRef.current) o.x -= shift
        }

        setScore(Math.floor(s.score))
      }

      // draw
      ctx.clearRect(0, 0, W, H)
      // track
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, 24, W, H - 48)
      // lane lines
      ctx.strokeStyle = '#334155'
      ctx.setLineDash([12, 10])
      ctx.beginPath()
      ctx.moveTo(0, TRACK_Y)
      ctx.lineTo(W, TRACK_Y)
      ctx.stroke()
      ctx.setLineDash([])

      // obstacles
      ctx.fillStyle = '#f59e0b'
      for (const o of obstaclesRef.current) {
        ctx.fillRect(o.x, o.y, o.w, o.h)
        ctx.fillStyle = '#b45309'
        ctx.fillRect(o.x + 2, o.y + 2, o.w - 4, 6)
        ctx.fillStyle = '#f59e0b'
      }

      // kart body
      const kx = s.x
      const ky = s.y
      ctx.fillStyle = s.alive ? '#0ea5e9' : '#64748b'
      ctx.beginPath()
      ctx.roundRect(kx - 14, ky - 10, 28, 20, 4)
      ctx.fill()
      ctx.fillStyle = '#0369a1'
      ctx.fillRect(kx - 6, ky - 6, 14, 12)
      // wheels
      ctx.fillStyle = '#0f172a'
      ctx.fillRect(kx - 12, ky - 12, 8, 4)
      ctx.fillRect(kx + 4, ky - 12, 8, 4)
      ctx.fillRect(kx - 12, ky + 8, 8, 4)
      ctx.fillRect(kx + 4, ky + 8, 8, 4)

      if (!s.alive) {
        ctx.fillStyle = 'rgba(15,23,42,0.72)'
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 16px system-ui,sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('Crashed — press R or Restart', W / 2, H / 2 - 6)
        ctx.font = '13px system-ui,sans-serif'
        ctx.fillStyle = '#94a3b8'
        ctx.fillText(`Score ${Math.floor(s.score)}`, W / 2, H / 2 + 16)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [reset])

  return (
    <div className="grid gap-6 lg:grid-cols-[auto_1fr] items-start">
      <Card className="overflow-hidden border-sky-100 dark:border-sky-900/40 w-fit mx-auto lg:mx-0">
        <div className="bg-navy px-4 py-3 text-white flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-300">
              Principal only
            </p>
            <p className="font-bold">Beacon Kart</p>
          </div>
          <div className="text-right text-xs text-slate-300">
            <div>
              Score <span className="font-bold text-white tabular-nums">{score}</span>
            </div>
            <div>
              Best <span className="font-bold text-sky-300 tabular-nums">{best}</span>
            </div>
          </div>
        </div>
        <CardContent className="p-3 bg-slate-950">
          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            className="rounded-lg border border-slate-700 w-full max-w-[360px]"
            role="application"
            aria-label="Go-kart racing game"
          />
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="pt-5 space-y-3">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={reset}>
                {alive ? 'Restart' : 'Play again'}
              </Button>
            </div>
            <div className="rounded-xl border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground text-sm">Controls</p>
              <p>
                <kbd className="rounded border px-1.5 py-0.5 text-[10px] font-semibold">A</kbd> / ←
                left ·{' '}
                <kbd className="rounded border px-1.5 py-0.5 text-[10px] font-semibold">D</kbd> / →
                right · R after crash
              </p>
              <p className="pt-1">Auto-starts. High score stays on this browser only.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

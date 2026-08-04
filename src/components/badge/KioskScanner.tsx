'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { kioskScanAction } from '@/app/actions/badge'
import type { ScanDirection } from '@/lib/badge/types'
import type { SchoolRoom } from '@/lib/badge/types'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function KioskScanner({
  token,
  schoolName,
  rooms,
}: {
  token: string
  schoolName: string
  rooms: SchoolRoom[]
}) {
  const [roomId, setRoomId] = useState(rooms[0]?.id ?? '')
  const [direction, setDirection] = useState<ScanDirection>('in')
  const [code, setCode] = useState('')
  const [flash, setFlash] = useState<{
    ok: boolean
    text: string
  } | null>(null)
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
    const t = setInterval(() => inputRef.current?.focus(), 2000)
    return () => clearInterval(t)
  }, [])

  function submit(raw?: string) {
    const value = (raw ?? code).trim()
    if (!value || !roomId) return
    setFlash(null)
    start(async () => {
      const r = await kioskScanAction({
        token,
        rawCode: value,
        roomId,
        direction,
        kioskLabel: rooms.find((x) => x.id === roomId)?.name,
      })
      if (!r.ok) {
        setFlash({ ok: false, text: r.error })
      } else {
        setFlash({ ok: true, text: r.message })
      }
      setCode('')
      inputRef.current?.focus()
      // Auto-clear banner
      setTimeout(() => setFlash(null), 5000)
    })
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col">
      <header className="border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-400">
            Beacon kiosk
          </p>
          <h1 className="text-lg font-bold">{schoolName}</h1>
        </div>
        <p className="text-xs text-slate-400">Scan badge or type code → Enter</p>
      </header>

      <main className="flex-1 mx-auto w-full max-w-xl px-4 py-6 space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Room</p>
          <div className="flex flex-wrap gap-2">
            {rooms.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRoomId(r.id)}
                className={cn(
                  'rounded-xl border px-3 py-2 text-sm font-semibold',
                  roomId === r.id
                    ? 'border-sky-400 bg-sky-500 text-white'
                    : 'border-white/15 bg-white/5 text-slate-200'
                )}
              >
                {r.name}
                {r.kind === 'aftercare' ? ' · aftercare' : ''}
              </button>
            ))}
          </div>
          {rooms.length === 0 && (
            <p className="text-sm text-amber-300">
              No rooms yet. Principal → Badges → add rooms, then refresh kiosk.
            </p>
          )}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase text-slate-400 mb-2">Direction</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDirection('in')}
              className={cn(
                'rounded-2xl py-4 text-lg font-black',
                direction === 'in' ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300'
              )}
            >
              IN
            </button>
            <button
              type="button"
              onClick={() => setDirection('out')}
              className={cn(
                'rounded-2xl py-4 text-lg font-black',
                direction === 'out' ? 'bg-amber-500 text-white' : 'bg-white/10 text-slate-300'
              )}
            >
              OUT
            </button>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
          className="space-y-3"
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-400">Badge code</span>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              autoComplete="off"
              autoCapitalize="characters"
              inputMode="text"
              className="mt-1 w-full rounded-2xl border-2 border-sky-500/50 bg-slate-900 px-4 py-5 text-center text-3xl font-mono font-bold tracking-widest text-white outline-none focus:border-sky-400"
              placeholder="SCAN…"
              disabled={pending || !roomId}
            />
          </label>
          <Button
            type="submit"
            size="lg"
            className="w-full h-14 text-base"
            disabled={pending || !code.trim() || !roomId}
          >
            {pending ? 'Saving…' : `Record ${direction.toUpperCase()}`}
          </Button>
        </form>

        {flash && (
          <div
            className={cn(
              'rounded-2xl border px-4 py-5 text-center text-lg font-bold',
              flash.ok
                ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-100'
                : 'border-red-400/50 bg-red-500/20 text-red-100'
            )}
          >
            {flash.text}
          </div>
        )}

        <p className="text-center text-[11px] text-slate-500 leading-relaxed">
          USB barcode/QR scanners work like a keyboard — scan into the box and press Enter.
          Classroom IN marks attendance present. Aftercare tracks time for payments.
        </p>
      </main>
    </div>
  )
}

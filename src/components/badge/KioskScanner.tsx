'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import {
  kioskPresenceAction,
  kioskScanAction,
  kioskSearchAction,
} from '@/app/actions/badge'
import type { ScanDirection, SchoolRoom } from '@/lib/badge/types'
import { CameraQrScanner } from '@/components/badge/CameraQrScanner'
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
  const [search, setSearch] = useState('')
  const [hits, setHits] = useState<
    { id: string; name: string; badgeCode: string | null; gradeLevel: string | null }[]
  >([])
  const [present, setPresent] = useState<
    { studentId: string; studentName: string; since: string }[]
  >([])
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, start] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)
  const focusLock = useRef(true)

  const refreshPresence = useCallback(() => {
    if (!roomId) return
    void kioskPresenceAction({ token, roomId }).then((r) => {
      if (r.ok) setPresent(r.present)
    })
  }, [token, roomId])

  useEffect(() => {
    refreshPresence()
    const t = setInterval(refreshPresence, 15_000)
    return () => clearInterval(t)
  }, [refreshPresence])

  useEffect(() => {
    const t = setInterval(() => {
      if (focusLock.current) inputRef.current?.focus()
    }, 2500)
    return () => clearInterval(t)
  }, [])

  function doScan(opts: { rawCode?: string; studentId?: string }) {
    if (!roomId) return
    setFlash(null)
    start(async () => {
      const r = await kioskScanAction({
        token,
        rawCode: opts.rawCode,
        studentId: opts.studentId,
        roomId,
        direction,
        kioskLabel: rooms.find((x) => x.id === roomId)?.name,
      })
      if (!r.ok) {
        setFlash({ ok: false, text: r.error })
      } else {
        setFlash({ ok: true, text: r.message })
        // Smart flip: after IN, ready for next student still on IN; keep direction
        refreshPresence()
      }
      setCode('')
      setSearch('')
      setHits([])
      focusLock.current = true
      inputRef.current?.focus()
      setTimeout(() => setFlash(null), 6000)
    })
  }

  function submitCode(raw?: string) {
    const value = (raw ?? code).trim()
    if (!value) return
    doScan({ rawCode: value })
  }

  useEffect(() => {
    if (search.trim().length < 2) return
    const handle = setTimeout(() => {
      void kioskSearchAction({ token, query: search }).then((r) => {
        if (r.ok) setHits(r.students)
      })
    }, 200)
    return () => clearTimeout(handle)
  }, [search, token])

  const searchHits = search.trim().length < 2 ? [] : hits

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white flex flex-col">
      <header className="border-b border-white/10 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-400">
            Beacon kiosk
          </p>
          <h1 className="text-lg font-bold">{schoolName}</h1>
        </div>
        <p className="text-xs text-slate-400">
          USB scan · camera · or search name
        </p>
      </header>

      <main className="flex-1 mx-auto w-full max-w-xl px-4 py-5 space-y-4 pb-safe">
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
                {r.kind === 'aftercare' ? ' · $' : ''}
              </button>
            ))}
          </div>
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

        <CameraQrScanner
          enabled={Boolean(roomId)}
          onCode={(c) => {
            focusLock.current = false
            submitCode(c)
          }}
        />

        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitCode()
          }}
          className="space-y-2"
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-400">Badge code</span>
            <input
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onFocus={() => {
                focusLock.current = true
              }}
              autoComplete="off"
              autoCapitalize="characters"
              className="mt-1 w-full rounded-2xl border-2 border-sky-500/50 bg-slate-900 px-4 py-4 text-center text-2xl font-mono font-bold tracking-widest text-white outline-none focus:border-sky-400"
              placeholder="SCAN OR TYPE…"
              disabled={pending || !roomId}
            />
          </label>
          <Button
            type="submit"
            size="lg"
            className="w-full h-12"
            disabled={pending || !code.trim() || !roomId}
          >
            {pending ? 'Saving…' : `Record ${direction.toUpperCase()}`}
          </Button>
        </form>

        <div>
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-400">
              No badge? Search name
            </span>
            <input
              value={search}
              onChange={(e) => {
                focusLock.current = false
                setSearch(e.target.value)
              }}
              onBlur={() => {
                focusLock.current = true
              }}
              className="mt-1 w-full rounded-xl border border-white/15 bg-slate-900 px-3 py-3 text-sm text-white outline-none focus:border-sky-400"
              placeholder="Start typing last name…"
              disabled={pending || !roomId}
            />
          </label>
          {searchHits.length > 0 && (
            <ul className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-white/10 divide-y divide-white/10">
              {searchHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-white/10"
                    onClick={() => doScan({ studentId: h.id })}
                  >
                    <span className="font-semibold">{h.name}</span>
                    {h.gradeLevel && (
                      <span className="text-slate-400"> · {h.gradeLevel}</span>
                    )}
                    {h.badgeCode && (
                      <span className="ml-2 font-mono text-xs text-sky-300">
                        {h.badgeCode}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

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

        <section className="rounded-xl border border-white/10 bg-white/5 p-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
              In this room now
            </p>
            <button
              type="button"
              className="text-[11px] text-sky-400"
              onClick={() => refreshPresence()}
            >
              Refresh
            </button>
          </div>
          {present.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">Nobody checked in yet.</p>
          ) : (
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto text-sm">
              {present.map((p) => (
                <li
                  key={p.studentId}
                  className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-2 py-1.5"
                >
                  <span>{p.studentName}</span>
                  <button
                    type="button"
                    className="text-[11px] font-semibold text-amber-300"
                    onClick={() => {
                      setDirection('out')
                      doScan({ studentId: p.studentId })
                    }}
                  >
                    Check out
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}

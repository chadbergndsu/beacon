'use client'

import { useEffect, useState, useTransition } from 'react'
import {
  staffRoomsAction,
  staffScanAction,
  staffSearchAction,
} from '@/app/actions/badge'
import type { ScanDirection, SchoolRoom } from '@/lib/badge/types'
import { CameraQrScanner } from '@/components/badge/CameraQrScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageHeader } from '@/components/ui/page-header'
import { cn } from '@/lib/utils'

export function StaffScanner() {
  const [rooms, setRooms] = useState<SchoolRoom[]>([])
  const [roomId, setRoomId] = useState('')
  const [direction, setDirection] = useState<ScanDirection>('in')
  const [code, setCode] = useState('')
  const [search, setSearch] = useState('')
  const [hits, setHits] = useState<
    { id: string; name: string; badgeCode: string | null; gradeLevel: string | null }[]
  >([])
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  useEffect(() => {
    start(async () => {
      const r = await staffRoomsAction()
      if (!r.ok) {
        setErr(r.error)
        return
      }
      setRooms(r.rooms)
      setRoomId(r.rooms[0]?.id ?? '')
    })
  }, [])

  useEffect(() => {
    if (search.trim().length < 2) {
      return
    }
    const handle = setTimeout(() => {
      void staffSearchAction({ query: search }).then((r) => {
        if (r.ok) setHits(r.students)
      })
    }, 200)
    return () => clearTimeout(handle)
  }, [search])

  const searchHits = search.trim().length < 2 ? [] : hits

  function scan(opts: { rawCode?: string; studentId?: string }) {
    if (!roomId) return
    setMsg(null)
    setErr(null)
    start(async () => {
      const r = await staffScanAction({
        rawCode: opts.rawCode,
        studentId: opts.studentId,
        roomId,
        direction,
      })
      if (!r.ok) {
        setErr(r.error)
        return
      }
      setMsg(r.message)
      setCode('')
      setSearch('')
      setHits([])
    })
  }

  return (
    <div className="mx-auto max-w-lg page-stack">
      <PageHeader
        title="Staff scanner"
        description="Badge, camera QR, or name search from your signed-in desk. Public room kiosks require a physical badge only."
      />

      {err && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {err}
        </p>
      )}
      {msg && (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
          {msg}
        </p>
      )}

      <div>
        <Label>Room</Label>
        <select
          className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        >
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name} ({r.kind})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setDirection('in')}
          className={cn(
            'rounded-xl py-3 font-bold',
            direction === 'in' ? 'bg-emerald-600 text-white' : 'border bg-card'
          )}
        >
          IN
        </button>
        <button
          type="button"
          onClick={() => setDirection('out')}
          className={cn(
            'rounded-xl py-3 font-bold',
            direction === 'out' ? 'bg-amber-500 text-white' : 'border bg-card'
          )}
        >
          OUT
        </button>
      </div>

      <div className="rounded-xl border bg-slate-950 p-3 text-white">
        <CameraQrScanner
          enabled={Boolean(roomId)}
          onCode={(c) => scan({ rawCode: c })}
        />
      </div>

      <div>
        <Label>Badge code</Label>
        <Input
          className="mt-1 font-mono text-lg tracking-wider"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              scan({ rawCode: code })
            }
          }}
          placeholder="Scan or type"
        />
      </div>
      <Button
        type="button"
        disabled={pending || !code || !roomId}
        onClick={() => scan({ rawCode: code })}
      >
        {pending ? 'Saving…' : `Record ${direction.toUpperCase()}`}
      </Button>

      <div>
        <Label>No badge? Search name</Label>
        <Input
          className="mt-1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Start typing last name…"
          disabled={pending || !roomId}
        />
        {searchHits.length > 0 && (
          <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border divide-y bg-card">
            {searchHits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/60"
                  onClick={() => scan({ studentId: h.id })}
                  disabled={pending}
                >
                  <span className="font-semibold">{h.name}</span>
                  {h.gradeLevel && (
                    <span className="text-muted-foreground"> · {h.gradeLevel}</span>
                  )}
                  {h.badgeCode && (
                    <span className="ml-2 font-mono text-xs text-primary">
                      ···{h.badgeCode.slice(-3)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

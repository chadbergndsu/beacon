'use client'

import { useEffect, useState, useTransition } from 'react'
import { staffRoomsAction, staffScanAction } from '@/app/actions/badge'
import type { ScanDirection, SchoolRoom } from '@/lib/badge/types'
import { CameraQrScanner } from '@/components/badge/CameraQrScanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function StaffScanner() {
  const [rooms, setRooms] = useState<SchoolRoom[]>([])
  const [roomId, setRoomId] = useState('')
  const [direction, setDirection] = useState<ScanDirection>('in')
  const [code, setCode] = useState('')
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

  function scan(raw?: string) {
    const value = (raw ?? code).trim()
    if (!value || !roomId) return
    setMsg(null)
    setErr(null)
    start(async () => {
      const r = await staffScanAction({
        rawCode: value,
        roomId,
        direction,
      })
      if (!r.ok) {
        setErr(r.error)
        return
      }
      setMsg(r.message)
      setCode('')
    })
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-bold text-navy dark:text-sky-50">Staff scanner</h1>
        <p className="text-sm text-muted-foreground">
          Scan or type badge codes from your laptop — same rules as the room kiosk.
        </p>
      </div>

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
        <CameraQrScanner enabled={Boolean(roomId)} onCode={(c) => scan(c)} />
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
              scan()
            }
          }}
          placeholder="Scan or type"
        />
      </div>
      <Button type="button" disabled={pending || !code || !roomId} onClick={() => scan()}>
        {pending ? 'Saving…' : `Record ${direction.toUpperCase()}`}
      </Button>
    </div>
  )
}

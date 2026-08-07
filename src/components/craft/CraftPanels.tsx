'use client'

import { useState } from 'react'
import type { CraftFloorLayout, CraftStudentOption, CraftVisibleMarker } from '@/lib/craft/types'
import { FAKE_DEMO_STUDENTS, matchMarkerByName } from '@/lib/craft/presence'
import { allRooms } from '@/lib/craft/layout'
import { broadcastCraftPresenceRefresh } from '@/lib/craft/realtime-client'
import { useCraftUi } from './CraftUiContext'

export function MockScanPanel({
  layout,
  schoolId,
  onScan,
}: {
  layout: CraftFloorLayout
  schoolId: string
  onScan: () => void
}) {
  const options: CraftStudentOption[] = [...FAKE_DEMO_STUDENTS]
  const [studentId, setStudentId] = useState(options[0]?.id ?? '')
  const [roomId, setRoomId] = useState(allRooms(layout)[2]?.roomId ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setMessage(null)
    const student = options.find((s) => s.id === studentId)
    try {
      const res = await fetch('/api/craft/mock-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId,
          studentName: student?.name,
          roomId,
        }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setMessage(data.error || 'Scan failed.')
      } else {
        setMessage(`Placed ${student?.name ?? 'student'} in room (demo name).`)
        void broadcastCraftPresenceRefresh(schoolId)
        onScan()
      }
    } catch {
      setMessage('Network error.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/95 p-3 text-sm text-violet-950 shadow-sm">
      <p className="font-semibold">Mock badge scan (admin)</p>
      <p className="mt-1 text-xs text-violet-800">
        Uses fictional demo kids only — never real minor names on the twin.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs">
          Demo student
          <select
            className="rounded border border-violet-200 bg-white px-2 py-1.5"
            value={studentId || options[0]?.id || ''}
            onChange={(e) => setStudentId(e.target.value)}
          >
            {options.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.gradeLevel ? ` (${s.gradeLevel})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs">
          Room
          <select
            className="rounded border border-violet-200 bg-white px-2 py-1.5"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          >
            {allRooms(layout).map((r) => (
              <option key={r.roomId} value={r.roomId}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void submit()}
        className="mt-2 rounded-md bg-violet-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-60"
      >
        {busy ? 'Sending…' : 'Trigger scan'}
      </button>
      {message ? <p className="mt-2 text-xs">{message}</p> : null}
    </div>
  )
}

export function PersonSearch({
  markers,
  onSelectPerson,
}: {
  markers: CraftVisibleMarker[]
  onSelectPerson: (marker: CraftVisibleMarker) => void
}) {
  const { setHighlightMarkerId } = useCraftUi()
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  function go() {
    const marker = matchMarkerByName(markers, query)
    if (!marker) {
      setMessage('No visible person matches that name.')
      setHighlightMarkerId(null)
      return
    }
    setMessage(null)
    setHighlightMarkerId(marker.id)
    onSelectPerson(marker)
  }

  return (
    <div className="grid gap-1">
      <div className="flex flex-wrap items-end gap-2">
        <label className="grid min-w-0 flex-1 gap-1 text-xs text-slate-700">
          Find person
          <input
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            placeholder="Teacher or child name"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setMessage(null)
              const hit = matchMarkerByName(markers, e.target.value)
              setHighlightMarkerId(hit?.id ?? null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') go()
            }}
          />
        </label>
        <button
          type="button"
          onClick={go}
          className="rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-800"
        >
          Go
        </button>
      </div>
      {message ? <p className="text-[11px] text-amber-800">{message}</p> : null}
    </div>
  )
}

export function RoomSearch({
  layout,
  onSelectRoom,
}: {
  layout: CraftFloorLayout
  onSelectRoom: (roomId: string) => void
}) {
  const [q, setQ] = useState('')
  const rooms = allRooms(layout).filter((r) =>
    r.name.toLowerCase().includes(q.trim().toLowerCase())
  )

  return (
    <div className="rounded-lg border border-slate-200 bg-white/95 p-3 text-sm shadow-sm">
      <p className="font-semibold text-slate-900">Go to room</p>
      <input
        className="mt-2 w-full rounded border border-slate-200 px-2 py-1.5 text-xs"
        placeholder="Search rooms…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs">
        {rooms.map((r) => (
          <li key={r.roomId}>
            <button
              type="button"
              className="w-full rounded px-2 py-1 text-left hover:bg-slate-100"
              onClick={() => onSelectRoom(r.roomId)}
            >
              {r.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import type { CraftFloorLayout, CraftStudentOption } from '@/lib/craft/types'
import { getRoomByName } from '@/lib/craft/layout'
import { useCraftUi } from './CraftUiContext'

export function MockScanPanel({
  layout,
  onScan,
}: {
  layout: CraftFloorLayout
  onScan: () => void
}) {
  const [students, setStudents] = useState<CraftStudentOption[]>([])
  const [studentId, setStudentId] = useState('')
  const [roomId, setRoomId] = useState(layout.rooms[2]?.roomId ?? '')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void fetch('/api/craft/students')
      .then((r) => r.json())
      .then((data: { ok?: boolean; students?: CraftStudentOption[] }) => {
        if (cancelled || !data.ok || !data.students?.length) return
        setStudents(data.students)
        setStudentId(data.students[0]?.id ?? '')
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])

  const fallbackStudents: CraftStudentOption[] = [
    { id: 'demo-stu-1', name: 'Alex Rivera', gradeLevel: '3' },
    { id: 'demo-stu-2', name: 'Blake Chen', gradeLevel: '4' },
  ]
  const options = students.length ? students : fallbackStudents

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
        setMessage(`Placed ${student?.name ?? 'student'} in room.`)
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
        Simulates a door scan — markers update on the next poll.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs">
          Student
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
            {layout.rooms.map((r) => (
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

export function RoomSearch({
  layout,
  onSelectRoom,
}: {
  layout: CraftFloorLayout
  onSelectRoom: (roomId: string) => void
}) {
  const { setHighlightRoomId } = useCraftUi()
  const [query, setQuery] = useState('')

  function go() {
    const room = getRoomByName(layout, query)
    if (room) {
      setHighlightRoomId(room.roomId)
      onSelectRoom(room.roomId)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className="grid flex-1 gap-1 text-xs text-slate-700 min-w-[140px]">
        Teleport / search room
        <input
          className="rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
          placeholder="Room 101 or room id"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            const room = getRoomByName(layout, e.target.value)
            setHighlightRoomId(room?.roomId ?? null)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') go()
          }}
        />
      </label>
      <button
        type="button"
        onClick={go}
        className="rounded-md bg-sky-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-800"
      >
        Go
      </button>
    </div>
  )
}

'use client'

import { useState, useTransition } from 'react'
import { saveCraftRoomMapAction } from '@/app/actions/craft'
import { allRooms } from '@/lib/craft/campus'
import type { CraftCampusLayout } from '@/lib/craft/types'
import type { SchoolRoom } from '@/lib/badge/types'
import { Button } from '@/components/ui/button'

export function CraftRoomMapPanel({
  layout,
  schoolRooms,
  initialMap,
}: {
  layout: CraftCampusLayout
  schoolRooms: Pick<SchoolRoom, 'id' | 'name'>[]
  initialMap: Record<string, string>
}) {
  const [map, setMap] = useState(initialMap)
  const [pending, start] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const rooms = allRooms(layout)
  const mappedCount = rooms.filter((r) => map[r.roomId]).length

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Twin room mapping</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Link each layout room to a live <code className="text-[10px]">school_rooms</code> row so
            badge scans appear in the correct voxel room. {mappedCount}/{rooms.length} mapped.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => {
            setMessage(null)
            setError(null)
            start(async () => {
              const result = await saveCraftRoomMapAction(map)
              if (!result.ok) {
                setError(result.error)
                return
              }
              setMessage('Room mapping saved.')
            })
          }}
        >
          Save mapping
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[28rem] text-left text-xs">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Layout room</th>
              <th className="py-2 font-medium">Badge room</th>
            </tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.roomId} className="border-b border-border/60">
                <td className="py-2 pr-3 align-middle">
                  <span className="font-medium text-foreground">{room.name}</span>
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">{room.roomId}</span>
                </td>
                <td className="py-2 align-middle">
                  <select
                    className="w-full max-w-xs rounded-md border border-input bg-background px-2 py-1.5"
                    value={map[room.roomId] ?? ''}
                    onChange={(e) =>
                      setMap((prev) => {
                        const next = { ...prev }
                        if (e.target.value) next[room.roomId] = e.target.value
                        else delete next[room.roomId]
                        return next
                      })
                    }
                  >
                    <option value="">— not mapped —</option>
                    {schoolRooms.map((sr) => (
                      <option key={sr.id} value={sr.id}>
                        {sr.name}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message ? <p className="mt-3 text-xs font-medium text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-xs font-medium text-red-700">{error}</p> : null}
    </div>
  )
}

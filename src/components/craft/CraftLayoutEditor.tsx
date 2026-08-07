'use client'

import { useMemo, useState, useTransition } from 'react'
import type { CraftCampusLayout, CraftRoomDef } from '@/lib/craft/types'
import type { RoomKind } from '@/lib/badge/types'
import { getFloor } from '@/lib/craft/campus'
import { layoutBounds } from '@/lib/craft/campus'
import { parseCraftLayout } from '@/lib/craft/layout-validate'
import { parseJsonLayout, parseSvgFloorPlan } from '@/lib/craft/svg-import'
import { saveCraftLayoutAction } from '@/app/actions/craft'
import { Button } from '@/components/ui/button'

const KINDS: RoomKind[] = ['classroom', 'office', 'gym', 'aftercare', 'other']

export function CraftLayoutEditor({ initialLayout }: { initialLayout: CraftCampusLayout }) {
  const [layout, setLayout] = useState<CraftCampusLayout>(initialLayout)
  const [activeFloorId, setActiveFloorId] = useState(initialLayout.floors[0]?.floorId ?? 'floor-1')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const floor = getFloor(layout, activeFloorId)
  const bounds = useMemo(
    () => (floor ? layoutBounds({ ...layout, floors: [floor] }) : { minX: 0, maxX: 48, minZ: 0, maxZ: 36 }),
    [layout, floor]
  )
  const selected = floor?.rooms.find((r) => r.roomId === selectedId)

  function updateRoom(roomId: string, patch: Partial<CraftRoomDef>) {
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) =>
        f.floorId !== activeFloorId
          ? f
          : { ...f, rooms: f.rooms.map((r) => (r.roomId === roomId ? { ...r, ...patch } : r)) }
      ),
    }))
  }

  function addRoom() {
    const id = `craft-custom-${Date.now()}`
    const room: CraftRoomDef = {
      roomId: id,
      name: 'New room',
      kind: 'classroom',
      origin: [8, 0, 8],
      size: [10, 4, 8],
      color: '#bfdbfe',
    }
    setLayout((prev) => ({
      ...prev,
      floors: prev.floors.map((f) =>
        f.floorId === activeFloorId ? { ...f, rooms: [...f.rooms, room] } : f
      ),
    }))
    setSelectedId(id)
  }

  function save() {
    setMsg(null)
    setErr(null)
    start(async () => {
      const result = await saveCraftLayoutAction(layout)
      if (!result.ok) setErr(result.error)
      else setMsg('Layout saved to school settings.')
    })
  }

  function importJson(file: File) {
    void file.text().then((text) => {
      try {
        const parsed = parseCraftLayout(parseJsonLayout(text))
        if (!parsed) {
          setErr('Invalid layout JSON.')
          return
        }
        setLayout(parsed)
        setActiveFloorId(parsed.floors[0]?.floorId ?? 'floor-1')
        setMsg('Imported JSON layout.')
      } catch {
        setErr('Could not parse JSON file.')
      }
    })
  }

  function importSvg(file: File) {
    void file.text().then((text) => {
      const rooms = parseSvgFloorPlan(text, { scale: 0.05 })
      if (!rooms.length) {
        setErr('No SVG rects found.')
        return
      }
      setLayout((prev) => ({
        ...prev,
        floors: prev.floors.map((f) =>
          f.floorId === activeFloorId ? { ...f, rooms: [...f.rooms, ...rooms] } : f
        ),
      }))
      setMsg(`Imported ${rooms.length} rooms from SVG.`)
    })
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(layout, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${layout.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!floor) return null

  const width = bounds.maxX - bounds.minX || 48
  const height = bounds.maxZ - bounds.minZ || 36

  return (
    <div className="space-y-3 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-900 dark:bg-indigo-950/20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-indigo-950 dark:text-indigo-100">Campus layout editor</p>
          <p className="text-xs text-indigo-900/70">Drag rooms on the grid · import SVG/JSON · saves to school settings</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {layout.floors.map((f) => (
            <button
              key={f.floorId}
              type="button"
              onClick={() => setActiveFloorId(f.floorId)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                f.floorId === activeFloorId ? 'bg-indigo-700 text-white' : 'bg-white/80 text-indigo-900'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
        <div
          className="relative h-72 overflow-hidden rounded-lg border border-indigo-200 bg-slate-100 dark:bg-slate-900"
          style={{ touchAction: 'none' }}
        >
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: 'linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)',
            backgroundSize: '16px 16px',
          }} />
          {floor.rooms.map((room) => {
            const left = ((room.origin[0] - bounds.minX) / width) * 100
            const top = ((room.origin[2] - bounds.minZ) / height) * 100
            const w = (room.size[0] / width) * 100
            const h = (room.size[2] / height) * 100
            const active = room.roomId === selectedId
            return (
              <div
                key={room.roomId}
                role="button"
                tabIndex={0}
                onMouseDown={(e) => {
                  e.preventDefault()
                  setSelectedId(room.roomId)
                  const startX = e.clientX
                  const startZ = e.clientY
                  const [ox, , oz] = room.origin
                  const move = (ev: MouseEvent) => {
                    const dx = ev.clientX - startX
                    const dz = ev.clientY - startZ
                    updateRoom(room.roomId, {
                      origin: [
                        Math.max(0, Math.round(ox + dx / 8)),
                        0,
                        Math.max(0, Math.round(oz + dz / 8)),
                      ],
                    })
                  }
                  const up = () => {
                    window.removeEventListener('mousemove', move)
                    window.removeEventListener('mouseup', up)
                  }
                  window.addEventListener('mousemove', move)
                  window.addEventListener('mouseup', up)
                }}
                className={`absolute cursor-move rounded border-2 px-1 py-0.5 text-[9px] font-semibold shadow-sm ${
                  active ? 'border-sky-600 ring-2 ring-sky-300' : 'border-slate-400/60'
                }`}
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${w}%`,
                  height: `${h}%`,
                  backgroundColor: room.color,
                }}
              >
                {room.name}
              </div>
            )
          })}
        </div>

        <div className="space-y-2 text-xs">
          {selected ? (
            <>
              <label className="grid gap-1">
                Name
                <input
                  className="rounded border px-2 py-1"
                  value={selected.name}
                  onChange={(e) => updateRoom(selected.roomId, { name: e.target.value })}
                />
              </label>
              <label className="grid gap-1">
                Kind
                <select
                  className="rounded border px-2 py-1"
                  value={selected.kind}
                  onChange={(e) => updateRoom(selected.roomId, { kind: e.target.value as RoomKind })}
                >
                  {KINDS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
              <p className="text-[10px] text-muted-foreground">ID: {selected.roomId}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Select a room to edit properties.</p>
          )}
          <Button type="button" size="sm" variant="outline" onClick={addRoom}>
            Add room
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          Save layout
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={exportJson}>
          Export JSON
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
          Import JSON
          <input type="file" accept="application/json,.json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </label>
        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted">
          Import SVG
          <input type="file" accept="image/svg+xml,.svg" className="hidden" onChange={(e) => e.target.files?.[0] && importSvg(e.target.files[0])} />
        </label>
      </div>
      {msg ? <p className="text-xs font-medium text-emerald-800">{msg}</p> : null}
      {err ? <p className="text-xs font-medium text-red-700">{err}</p> : null}
    </div>
  )
}

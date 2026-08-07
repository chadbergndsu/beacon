'use client'

import type { CraftTrailPoint } from '@/lib/craft/types'
import { allRooms, getRoomById } from '@/lib/craft/campus'
import { useCraftUi } from './CraftUiContext'

export function TrailMarkers() {
  const { layout, trails } = useCraftUi()
  if (!trails.length) return null

  return (
    <>
      {trails.slice(0, 40).map((trail, index) => {
        const room = getRoomById(layout, trail.roomId)
        if (!room) return null
        const [ox, , oz] = room.origin
        const [w, , d] = room.size
        const x = ox + w * 0.25 + (index % 4) * 0.4
        const z = oz + d * 0.25 + Math.floor(index / 4) * 0.4
        return (
          <mesh key={`${trail.studentId}-${trail.since}`} position={[x, 0.35, z]}>
            <boxGeometry args={[0.25, 0.25, 0.25]} />
            <meshStandardMaterial color="#a855f7" transparent opacity={0.35} />
          </mesh>
        )
      })}
    </>
  )
}

export function TrailPanel({ trails }: { trails: CraftTrailPoint[] }) {
  if (!trails.length) {
    return (
      <p className="text-xs text-muted-foreground">
        No recent badge trails yet — scans appear here for admin review.
      </p>
    )
  }

  return (
    <ul className="mt-2 max-h-28 space-y-1 overflow-y-auto text-xs">
      {trails.slice(0, 20).map((t) => (
        <li key={`${t.studentId}-${t.since}`} className="flex justify-between gap-2">
          <span>
            {t.studentName} → {t.roomId.replace('craft-demo-', '').replace(/-/g, ' ')}
          </span>
          <span className="text-muted-foreground">{new Date(t.since).toLocaleTimeString()}</span>
        </li>
      ))}
    </ul>
  )
}

export function TeacherRoomPanel({
  roster,
  roomIds,
}: {
  roster: { id: string; name: string; gradeLevel: string | null }[]
  roomIds: string[]
}) {
  const { layout, markers, requestTeleport } = useCraftUi()
  const focusRoom = allRooms(layout).find((r) => roomIds.includes(r.roomId))

  return (
    <div className="rounded-lg border border-border bg-card/60 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">My classroom</p>
        {focusRoom ? (
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs hover:bg-slate-50"
            onClick={() => requestTeleport(focusRoom.roomId)}
          >
            Go to {focusRoom.name}
          </button>
        ) : null}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {markers.length} student{markers.length === 1 ? '' : 's'} visible in your room(s) right now.
      </p>
      {roster.length ? (
        <ul className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          {roster.map((s) => {
            const present = markers.some((m) => m.id === s.id && !m.anonymized)
            return (
              <li
                key={s.id}
                className={`rounded px-2 py-1 ${present ? 'bg-emerald-50 text-emerald-900' : 'bg-muted/40'}`}
              >
                {s.name}
                {s.gradeLevel ? ` · ${s.gradeLevel}` : ''}
                {present ? ' · here' : ''}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">Link a class to a room for roster hints.</p>
      )}
      <p className="mt-2 text-[11px] text-muted-foreground">
        Attendance desk actions coming next — for now use Scan or kiosk.
      </p>
    </div>
  )
}

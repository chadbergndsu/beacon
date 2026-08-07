'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Role } from '@/lib/types'
import type { CraftCampusLayout, CraftTrailPoint, CraftVisibleMarker } from '@/lib/craft/types'
import { canTriggerMockScans, canUseFlyMode } from '@/lib/craft/presence'
import { useCraftPresenceRealtime } from '@/lib/craft/realtime-client'
import { CraftUiProvider } from '@/components/craft/CraftUiContext'
import { CraftHud, MarkerLegend } from '@/components/craft/CraftHud'
import { TeacherRoomPanel, TrailPanel } from '@/components/craft/CraftSidePanels'

type PresenceResponse = {
  ok: boolean
  markers?: CraftVisibleMarker[]
  trails?: CraftTrailPoint[]
  teacherRoster?: { id: string; name: string; gradeLevel: string | null }[]
  meta?: { teacherRoomIds?: string[]; roomsMapped?: number; roomsTotal?: number }
  error?: string
}

export function CraftClient({
  layout,
  role,
  schoolId,
}: {
  layout: CraftCampusLayout
  role: Role
  schoolId: string
}) {
  const [markers, setMarkers] = useState<CraftVisibleMarker[]>([])
  const [trails, setTrails] = useState<CraftTrailPoint[]>([])
  const [teacherRoster, setTeacherRoster] = useState<
    { id: string; name: string; gradeLevel: string | null }[]
  >([])
  const [teacherRoomIds, setTeacherRoomIds] = useState<string[]>([])
  const [flyMode, setFlyMode] = useState(canUseFlyMode(role))
  const [error, setError] = useState<string | null>(null)

  const applyPresence = useCallback((data: PresenceResponse, ok: boolean) => {
    if (!ok || !data.ok) {
      setError(data.error || 'Could not load presence.')
      return
    }
    setError(null)
    setMarkers(data.markers ?? [])
    setTrails(data.trails ?? [])
    setTeacherRoster(data.teacherRoster ?? [])
    setTeacherRoomIds(data.meta?.teacherRoomIds ?? [])
  }, [])

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/craft/presence', { cache: 'no-store' })
      const data = (await res.json()) as PresenceResponse
      applyPresence(data, res.ok)
    } catch {
      setError('Network error loading presence.')
    }
  }, [applyPresence])

  useCraftPresenceRealtime(schoolId, refresh)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/craft/presence', { cache: 'no-store' })
        const data = (await res.json()) as PresenceResponse
        if (!cancelled) applyPresence(data, res.ok)
      } catch {
        if (!cancelled) setError('Network error loading presence.')
      }
    }

    void poll()
    const id = window.setInterval(() => void poll(), 15000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [applyPresence])

  return (
    <CraftUiProvider
      layout={layout}
      markers={markers}
      trails={trails}
      flyMode={flyMode}
      setFlyMode={setFlyMode}
    >
      <div className="space-y-3">
        {error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </div>
        ) : null}
        <CraftHud
          role={role}
          canFly={canUseFlyMode(role)}
          canMockScan={canTriggerMockScans(role)}
          markerCount={markers.length}
          markers={markers}
          schoolId={schoolId}
          onRefresh={() => void refresh()}
        />
        {role === 'teacher' ? (
          <TeacherRoomPanel roster={teacherRoster} roomIds={teacherRoomIds} />
        ) : null}
        {canTriggerMockScans(role) ? (
          <div className="rounded-lg border border-border bg-card/60 p-3">
            <p className="text-sm font-medium">Admin badge trails</p>
            <TrailPanel trails={trails} />
          </div>
        ) : null}
        <div className="rounded-lg border border-border bg-card/60 p-3">
          <p className="text-sm font-medium">Live presence</p>
          <MarkerLegend markers={markers} />
        </div>
      </div>
    </CraftUiProvider>
  )
}

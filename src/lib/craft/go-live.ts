import { createAdminClient } from '@/lib/supabase/admin'
import { listRooms } from '@/lib/badge/store'
import { DEMO_SCHOOL_LAYOUT } from './layout'
import { listMockPresence } from './presence-store'
import { loadCraftSettings } from './settings'
import { resolveRoomIdMap } from './rooms'

export type CraftReadiness = {
  roomsMapped: number
  roomsTotal: number
  hasBadgeActivity: boolean
  smokeTestDone: boolean
  ready: boolean
  detail: string
}

export function evaluateCraftReadiness(input: {
  roomsMapped: number
  roomsTotal: number
  hasBadgeActivity: boolean
  smokeTestDone: boolean
}): CraftReadiness {
  const { roomsMapped, roomsTotal, hasBadgeActivity, smokeTestDone } = input
  const allMapped = roomsTotal > 0 && roomsMapped >= roomsTotal
  const verified = hasBadgeActivity || smokeTestDone
  const ready = allMapped && verified

  let detail = `${roomsMapped}/${roomsTotal} twin rooms linked`
  if (!allMapped) {
    detail += ' — sync rooms from Go-live'
  } else if (!verified) {
    detail += ' — run a test scan or mark smoke test on Go-live'
  } else {
    detail += ' — ready for pilot'
  }

  return {
    roomsMapped,
    roomsTotal,
    hasBadgeActivity,
    smokeTestDone,
    ready,
    detail,
  }
}

export async function probeCraftReadiness(schoolId: string): Promise<CraftReadiness> {
  const layout = DEMO_SCHOOL_LAYOUT
  const roomsTotal = layout.rooms.length

  let schoolRooms: Awaited<ReturnType<typeof listRooms>> = []
  try {
    schoolRooms = await listRooms(schoolId)
  } catch {
    schoolRooms = []
  }

  const settings = await loadCraftSettings(schoolId)
  const map = resolveRoomIdMap(layout, schoolRooms, settings.roomIdMap || {})
  const roomsMapped = layout.rooms.filter((r) => Boolean(map[r.roomId])).length

  let hasBadgeActivity = listMockPresence(schoolId).length > 0
  if (!hasBadgeActivity) {
    try {
      const admin = createAdminClient()
      const { count } = await admin
        .from('badge_scans')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
      hasBadgeActivity = (count ?? 0) > 0
    } catch {
      hasBadgeActivity = false
    }
  }

  return evaluateCraftReadiness({
    roomsMapped,
    roomsTotal,
    hasBadgeActivity,
    smokeTestDone: Boolean(settings.smokeTestAt),
  })
}

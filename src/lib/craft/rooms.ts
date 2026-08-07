import { listRooms, upsertRoom } from '@/lib/badge/store'
import type { SchoolRoom } from '@/lib/badge/types'
import { allRooms, buildRoomIdMap } from './campus'
import type { CraftFloorLayout } from './types'
import { loadCraftSettings, loadCraftLayoutForSchool, saveCraftRoomMap } from './settings'

export function resolveRoomIdMap(
  layout: CraftFloorLayout,
  schoolRooms: Pick<SchoolRoom, 'id' | 'name'>[],
  savedMap: Record<string, string> = {}
): Record<string, string> {
  const byName = buildRoomIdMap(layout, schoolRooms)
  const merged: Record<string, string> = { ...byName }
  for (const [layoutId, dbId] of Object.entries(savedMap)) {
    if (schoolRooms.some((r) => r.id === dbId)) {
      merged[layoutId] = dbId
    }
  }
  return merged
}

export async function loadCraftRoomMapping(
  schoolId: string,
  layout?: CraftFloorLayout
): Promise<{
  layoutToDb: Record<string, string>
  dbToLayout: Record<string, string>
}> {
  const resolvedLayout = layout ?? (await loadCraftLayoutForSchool(schoolId))
  const [schoolRooms, settings] = await Promise.all([
    listRooms(schoolId).catch(() => [] as SchoolRoom[]),
    loadCraftSettings(schoolId),
  ])
  const layoutToDb = resolveRoomIdMap(resolvedLayout, schoolRooms, settings.roomIdMap || {})
  const dbToLayout: Record<string, string> = {}
  for (const [layoutId, dbId] of Object.entries(layoutToDb)) {
    dbToLayout[dbId] = layoutId
  }
  return { layoutToDb, dbToLayout }
}

export async function syncLayoutRoomsToSchool(
  schoolId: string,
  layout?: CraftFloorLayout
): Promise<{ created: number; mapped: number; roomIdMap: Record<string, string> }> {
  const resolvedLayout = layout ?? (await loadCraftLayoutForSchool(schoolId))
  const existing = await listRooms(schoolId)
  const byName = new Map(existing.map((r) => [r.name.trim().toLowerCase(), r]))
  let created = 0
  const roomIdMap: Record<string, string> = {}

  for (const lr of allRooms(resolvedLayout)) {
    const hit = byName.get(lr.name.trim().toLowerCase())
    if (hit) {
      roomIdMap[lr.roomId] = hit.id
      continue
    }
    const result = await upsertRoom(schoolId, {
      name: lr.name,
      kind: lr.kind,
      billable: lr.kind === 'aftercare',
      rateCentsPerHour: lr.kind === 'aftercare' ? 800 : 0,
    })
    if (result.ok) {
      created++
      roomIdMap[lr.roomId] = result.room.id
      byName.set(lr.name.trim().toLowerCase(), result.room)
    }
  }

  const settings = await loadCraftSettings(schoolId)
  const merged = resolveRoomIdMap(resolvedLayout, [...existing, ...Object.values(byName)], {
    ...settings.roomIdMap,
    ...roomIdMap,
  })
  await saveCraftRoomMap(schoolId, merged, resolvedLayout.id)

  return { created, mapped: Object.keys(merged).length, roomIdMap: merged }
}

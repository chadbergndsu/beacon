import { mergeSchoolSettingsNested } from '@/lib/school-settings'

export type CraftSchoolSettings = {
  layoutId?: string
  /** layout roomId → school_rooms.id */
  roomIdMap?: Record<string, string>
  smokeTestAt?: string | null
}

export async function loadCraftSettings(schoolId: string): Promise<CraftSchoolSettings> {
  const { createAdminClient } = await import('@/lib/supabase/admin')
  const admin = createAdminClient()
  const { data } = await admin.from('schools').select('settings').eq('id', schoolId).maybeSingle()
  const craft = ((data?.settings || {}) as { craft?: CraftSchoolSettings }).craft || {}
  return {
    layoutId: craft.layoutId,
    roomIdMap: craft.roomIdMap || {},
    smokeTestAt: craft.smokeTestAt ?? null,
  }
}

export async function saveCraftRoomMap(
  schoolId: string,
  roomIdMap: Record<string, string>,
  layoutId: string
): Promise<void> {
  const r = await mergeSchoolSettingsNested(schoolId, 'craft', {
    layoutId,
    roomIdMap,
  })
  if (!r.ok) throw new Error(r.error)
}

export async function markCraftSmokeTest(schoolId: string): Promise<void> {
  const r = await mergeSchoolSettingsNested(schoolId, 'craft', {
    smokeTestAt: new Date().toISOString(),
  })
  if (!r.ok) throw new Error(r.error)
}

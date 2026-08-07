import { mergeSchoolSettingsNested } from '@/lib/school-settings'
import type { CraftFloorLayout } from './types'
import { DEMO_SCHOOL_LAYOUT } from './layout'
import { parseCraftLayout } from './layout-validate'

export type CraftSchoolSettings = {
  layoutId?: string
  /** layout roomId → school_rooms.id */
  roomIdMap?: Record<string, string>
  smokeTestAt?: string | null
  customLayout?: CraftFloorLayout
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
    customLayout: craft.customLayout,
  }
}

export async function loadCraftLayoutForSchool(schoolId: string): Promise<CraftFloorLayout> {
  const settings = await loadCraftSettings(schoolId)
  const parsed = settings.customLayout ? parseCraftLayout(settings.customLayout) : null
  return parsed ?? DEMO_SCHOOL_LAYOUT
}

export async function saveCraftCustomLayout(
  schoolId: string,
  layout: CraftFloorLayout
): Promise<void> {
  const r = await mergeSchoolSettingsNested(schoolId, 'craft', {
    customLayout: layout,
    layoutId: layout.id,
  })
  if (!r.ok) throw new Error(r.error)
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

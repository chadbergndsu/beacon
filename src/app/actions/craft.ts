'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveRole, isLeadership } from '@/lib/roles'
import type { Role } from '@/lib/types'
import { syncLayoutRoomsToSchool } from '@/lib/craft/rooms'
import { markCraftSmokeTest } from '@/lib/craft/settings'
import { loadReleaseChecklistState, saveReleaseChecklistState } from '@/lib/ops/release-checklist'
import { parseCraftLayout } from '@/lib/craft/layout-validate'
import type { CraftCampusLayout } from '@/lib/craft/types'

async function requireCraftLeadership() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role, email')
    .eq('id', user.id)
    .maybeSingle()

  const role = effectiveRole(
    profile ? { role: profile.role as Role, email: profile.email as string | null } : null
  )
  if (!profile?.school_id || !isLeadership(role)) {
    return { ok: false as const, error: 'Principal or admin only.' }
  }

  return { ok: true as const, schoolId: profile.school_id as string, role: role! }
}

export async function syncCraftRoomsAction(): Promise<
  { ok: true; created: number; mapped: number } | { ok: false; error: string }
> {
  const auth = await requireCraftLeadership()
  if (!auth.ok) return auth

  try {
    const result = await syncLayoutRoomsToSchool(auth.schoolId)
    revalidatePath('/principal/release')
    revalidatePath('/principal/badges')
    revalidatePath('/craft')
    return { ok: true, created: result.created, mapped: result.mapped }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Sync failed.' }
  }
}

export async function markCraftSmokeAction(): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireCraftLeadership()
  if (!auth.ok) return auth

  try {
    await markCraftSmokeTest(auth.schoolId)
    const checklist = await loadReleaseChecklistState(auth.schoolId)
    await saveReleaseChecklistState(auth.schoolId, { ...checklist, craft_smoke: true })
    revalidatePath('/principal/release')
    revalidatePath('/craft')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Could not save smoke test.' }
  }
}

export async function saveCraftLayoutAction(
  layout: CraftCampusLayout
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireCraftLeadership()
  if (!auth.ok) return auth

  const parsed = parseCraftLayout(layout)
  if (!parsed) return { ok: false, error: 'Invalid campus layout.' }

  try {
    const { saveCraftCustomLayout } = await import('@/lib/craft/settings')
    await saveCraftCustomLayout(auth.schoolId, parsed)
    revalidatePath('/principal/release')
    revalidatePath('/craft')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed.' }
  }
}

export async function saveCraftRoomMapAction(
  roomIdMap: Record<string, string>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireCraftLeadership()
  if (!auth.ok) return auth

  try {
    const { loadCraftLayoutForSchool, saveCraftRoomMap } = await import('@/lib/craft/settings')
    const layout = await loadCraftLayoutForSchool(auth.schoolId)
    await saveCraftRoomMap(auth.schoolId, roomIdMap, layout.id)
    revalidatePath('/principal/release')
    revalidatePath('/principal/badges')
    revalidatePath('/craft')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed.' }
  }
}

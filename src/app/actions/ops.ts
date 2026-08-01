'use server'

import { revalidatePath } from 'next/cache'
import { requirePrincipal } from '@/lib/principal'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  RELEASE_CHECKLIST,
  loadReleaseChecklistState,
  saveReleaseChecklistState,
} from '@/lib/ops/release-checklist'

export async function toggleReleaseCheck(itemId: string, checked: boolean) {
  const { schoolId } = await requirePrincipal()
  if (!RELEASE_CHECKLIST.some((i) => i.id === itemId)) {
    return { ok: false as const, error: 'Unknown checklist item' }
  }
  const state = await loadReleaseChecklistState(schoolId)
  state[itemId] = checked
  await saveReleaseChecklistState(schoolId, state)
  revalidatePath('/principal/release')
  return { ok: true as const }
}

export async function saveSchoolBrand(input: {
  name: string
  shortName?: string
  tagline?: string
  websiteUrl?: string
  email?: string
  phone?: string
  city?: string
  state?: string
  mission?: string
  gradesServed?: string
}) {
  const { schoolId } = await requirePrincipal()
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()

  const prev = (data?.settings || {}) as Record<string, unknown>
  const prevBrand = (prev.brand || {}) as Record<string, string>
  const brand = {
    ...prevBrand,
    shortName: input.shortName?.trim() || prevBrand.shortName,
    tagline: input.tagline?.trim() || prevBrand.tagline,
    websiteUrl: input.websiteUrl?.trim() || prevBrand.websiteUrl,
    email: input.email?.trim() || prevBrand.email,
    phone: input.phone?.trim() || prevBrand.phone,
    city: input.city?.trim() || prevBrand.city,
    state: input.state?.trim() || prevBrand.state,
    mission: input.mission?.trim() || prevBrand.mission,
    gradesServed: input.gradesServed?.trim() || prevBrand.gradesServed,
  }

  const { error } = await admin
    .from('schools')
    .update({
      name: input.name.trim() || 'Your School',
      settings: { ...prev, brand },
    })
    .eq('id', schoolId)

  if (error) return { ok: false as const, error: error.message }
  revalidatePath('/principal/release')
  revalidatePath('/school')
  revalidatePath('/dashboard')
  revalidatePath('/login')
  return { ok: true as const }
}

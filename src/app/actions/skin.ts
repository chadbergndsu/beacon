'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { SKIN_COOKIE, isSkinId, type SkinId } from '@/lib/skins/catalog'
import type { UserPreferences } from '@/lib/view-prefs/types'

export async function saveSkinAction(
  skinId: string
): Promise<{ ok: true; skin: SkinId } | { ok: false; error: string }> {
  if (!isSkinId(skinId)) {
    return { ok: false, error: 'Unknown skin.' }
  }

  const cookieStore = await cookies()
  cookieStore.set(SKIN_COOKIE, skinId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 400,
    sameSite: 'lax',
    httpOnly: false, // readable by client hydrate
  })

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    try {
      const admin = createAdminClient()
      const { data: row } = await admin
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .maybeSingle()
      const existing = ((row as { preferences?: UserPreferences } | null)?.preferences ??
        {}) as UserPreferences
      const next: UserPreferences = { ...existing, skin: skinId }
      await admin.from('profiles').update({ preferences: next }).eq('id', user.id)
    } catch {
      // Cookie still applied; localStorage on client too
    }
  }

  revalidatePath('/', 'layout')
  return { ok: true, skin: skinId }
}

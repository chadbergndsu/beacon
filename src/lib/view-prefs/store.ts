import { createAdminClient } from '@/lib/supabase/admin'
import { cache } from 'react'
import { defaultLayoutForScreen, getScreenCatalog } from './registry'
import { resolveScreenLayout } from './resolve'
import type { ScreenId, ScreenLayout, UserPreferences, ViewLayoutsMap } from './types'

export const loadUserPreferences = cache(async function loadUserPreferences(
  userId: string
): Promise<UserPreferences> {
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return {}
    const prefs = (data as { preferences?: UserPreferences | null }).preferences
    if (!prefs || typeof prefs !== 'object') return {}
    return prefs
  } catch {
    return {}
  }
})

export async function loadScreenLayout(
  userId: string,
  screenId: ScreenId,
  presentSectionIds: string[]
): Promise<ScreenLayout> {
  const prefs = await loadUserPreferences(userId)
  const saved = prefs.viewLayouts?.[screenId]
  const catalog = getScreenCatalog(screenId).sections
  return resolveScreenLayout(screenId, presentSectionIds, saved, catalog)
}

export async function saveScreenLayout(
  userId: string,
  screenId: ScreenId,
  layout: ScreenLayout
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const admin = createAdminClient()
    const { data: row, error: readErr } = await admin
      .from('profiles')
      .select('preferences')
      .eq('id', userId)
      .maybeSingle()

    if (readErr) {
      // Column may not exist yet — surface a clear message
      if (/preferences|column/i.test(readErr.message)) {
        return {
          ok: false,
          error:
            'Run migration 009_user_preferences.sql (add profiles.preferences) to save layouts across devices. Local browser save still works.',
        }
      }
      return { ok: false, error: readErr.message }
    }

    const existing = ((row as { preferences?: UserPreferences } | null)?.preferences ??
      {}) as UserPreferences
    const viewLayouts: ViewLayoutsMap = { ...(existing.viewLayouts ?? {}) }
    viewLayouts[screenId] = {
      order: layout.order,
      hidden: layout.hidden,
    }
    const next: UserPreferences = { ...existing, viewLayouts }

    const { error } = await admin
      .from('profiles')
      .update({ preferences: next })
      .eq('id', userId)

    if (error) {
      if (/preferences|column/i.test(error.message)) {
        return {
          ok: false,
          error:
            'Run migration 009_user_preferences.sql (add profiles.preferences) to save layouts across devices. Local browser save still works.',
        }
      }
      return { ok: false, error: error.message }
    }
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'Could not save preferences.',
    }
  }
}

export function emptyLayout(screenId: ScreenId): ScreenLayout {
  return defaultLayoutForScreen(screenId)
}

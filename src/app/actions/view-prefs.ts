'use server'

import { createClient } from '@/lib/supabase/server'
import { saveScreenLayout } from '@/lib/view-prefs/store'
import type { ScreenId, ScreenLayout } from '@/lib/view-prefs/types'

export async function saveViewLayoutAction(
  screenId: ScreenId,
  layout: ScreenLayout
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  if (!layout || !Array.isArray(layout.order) || !Array.isArray(layout.hidden)) {
    return { ok: false, error: 'Invalid layout.' }
  }

  // Sanitize lengths
  const clean: ScreenLayout = {
    order: layout.order.filter((id) => typeof id === 'string').slice(0, 80),
    hidden: layout.hidden.filter((id) => typeof id === 'string').slice(0, 80),
  }

  return saveScreenLayout(user.id, screenId, clean)
}

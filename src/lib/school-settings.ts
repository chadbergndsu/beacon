/**
 * Safer schools.settings updates: merge keys into a fresh read of the blob.
 * Reduces cross-feature stomps vs blind full rewrites. Not a full multi-instance
 * lock — money data still better as first-class tables long-term.
 */
import { createAdminClient } from '@/lib/supabase/admin'

export async function mergeSchoolSettings(
  schoolId: string,
  patch: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()

  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error: readErr } = await admin
      .from('schools')
      .select('settings')
      .eq('id', schoolId)
      .maybeSingle()

    if (readErr) return { ok: false, error: readErr.message }

    const current = { ...((data?.settings || {}) as Record<string, unknown>) }
    const next = { ...current, ...patch }

    const { error: writeErr } = await admin
      .from('schools')
      .update({ settings: next })
      .eq('id', schoolId)

    if (!writeErr) return { ok: true }
    if (attempt === 0) continue
    return { ok: false, error: writeErr.message }
  }
  return { ok: false, error: 'Could not update school settings.' }
}

/** Merge one nested object key (e.g. badge prefs) onto latest settings. */
export async function mergeSchoolSettingsNested(
  schoolId: string,
  key: string,
  nestedPatch: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  for (let attempt = 0; attempt < 2; attempt++) {
    const { data, error: readErr } = await admin
      .from('schools')
      .select('settings')
      .eq('id', schoolId)
      .maybeSingle()
    if (readErr) return { ok: false, error: readErr.message }

    const current = { ...((data?.settings || {}) as Record<string, unknown>) }
    const prevNested = {
      ...((current[key] as Record<string, unknown> | undefined) || {}),
    }
    const next = {
      ...current,
      [key]: { ...prevNested, ...nestedPatch },
    }

    const { error: writeErr } = await admin
      .from('schools')
      .update({ settings: next })
      .eq('id', schoolId)
    if (!writeErr) return { ok: true }
    if (attempt === 0) continue
    return { ok: false, error: writeErr.message }
  }
  return { ok: false, error: 'Could not update school settings.' }
}

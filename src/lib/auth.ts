import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveRole, PRINCIPAL_EMAIL } from '@/lib/roles'
import type { Profile } from '@/lib/types'

export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/login')
  }

  return { supabase, user }
}

/**
 * Load profile after session verification.
 * Uses service role for the profile row so broken RLS never blanks the app shell,
 * but only after getUser() confirms a real session.
 */
export async function getProfile(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  user: NonNullable<Awaited<ReturnType<typeof requireUser>>['user']>
  profile: Profile | null
}> {
  const { supabase, user } = await requireUser()

  let profile: Profile | null = null
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('profiles')
      .select('id, school_id, role, full_name, email, phone')
      .eq('id', user.id)
      .maybeSingle()
    profile = (data as Profile | null) ?? null
  } catch {
    // Fall back to user-scoped client if service role missing in some envs
    const { data } = await supabase
      .from('profiles')
      .select('id, school_id, role, full_name, email, phone')
      .eq('id', user.id)
      .maybeSingle()
    profile = (data as Profile | null) ?? null
  }

  if (profile) {
    const role = effectiveRole(profile) ?? profile.role
    profile = {
      ...profile,
      role,
      full_name:
        profile.email?.toLowerCase() === PRINCIPAL_EMAIL
          ? profile.full_name || 'Chris Cowan'
          : profile.full_name,
    }
  }

  return { supabase, user, profile }
}

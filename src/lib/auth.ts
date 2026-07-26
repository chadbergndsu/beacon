import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

export async function getProfile(): Promise<{
  supabase: Awaited<ReturnType<typeof createClient>>
  user: NonNullable<Awaited<ReturnType<typeof requireUser>>['user']>
  profile: Profile | null
}> {
  const { supabase, user } = await requireUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, school_id, role, full_name, email, phone')
    .eq('id', user.id)
    .maybeSingle()

  let normalized = profile as Profile | null
  if (normalized) {
    const role = effectiveRole(normalized)
    if (role) normalized = { ...normalized, role }
    // Ensure principal display name is always Chris Cowan for the dedicated account
    if (normalized.email?.toLowerCase() === PRINCIPAL_EMAIL) {
      normalized = {
        ...normalized,
        role: 'principal',
        full_name: normalized.full_name || 'Chris Cowan',
      }
    }
  }

  return { supabase, user, profile: normalized }
}

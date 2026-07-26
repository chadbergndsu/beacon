import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { effectiveRole } from '@/lib/roles'

export async function requirePrincipal() {
  const { profile, user, supabase } = await getProfile()
  const role = effectiveRole(profile)

  if (!profile || (role !== 'principal' && role !== 'admin')) {
    redirect('/dashboard')
  }

  if (!profile.school_id) {
    redirect('/dashboard')
  }

  return {
    profile: { ...profile, role: role! },
    user,
    supabase,
    schoolId: profile.school_id,
  }
}

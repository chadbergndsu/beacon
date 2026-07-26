import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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

  return { supabase, user, profile: profile as Profile | null }
}

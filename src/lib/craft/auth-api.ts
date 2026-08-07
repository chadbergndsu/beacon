import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveRole } from '@/lib/roles'
import type { Profile } from '@/lib/types'

export async function requireCraftProfile(): Promise<
  | { ok: true; profile: Profile; userId: string }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 }),
    }
  }

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
    const { data } = await supabase
      .from('profiles')
      .select('id, school_id, role, full_name, email, phone')
      .eq('id', user.id)
      .maybeSingle()
    profile = (data as Profile | null) ?? null
  }

  if (!profile?.school_id) {
    return {
      ok: false,
      response: NextResponse.json(
        { ok: false, error: 'Profile or school not configured.' },
        { status: 403 }
      ),
    }
  }

  const role = effectiveRole(profile) ?? profile.role
  return {
    ok: true,
    userId: user.id,
    profile: { ...profile, role },
  }
}

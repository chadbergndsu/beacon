'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveRole, homePathForRole } from '@/lib/roles'
import { safeInternalPath } from '@/lib/safe-redirect'
import { recordPilotActivity } from '@/lib/pilot-analytics/activity'
import type { Profile } from '@/lib/types'

export type AuthState = {
  error?: string
}

export async function login(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  const nextRaw = String(formData.get('next') || '')

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  if (password.length > 200) {
    return { error: 'Invalid credentials.' }
  }

  const { rateLimitAsync } = await import('@/lib/security/rate-limit')
  const rl = await rateLimitAsync({
    key: `login:${email}`,
    limit: 20,
    windowMs: 15 * 60 * 1000,
  })
  if (!rl.ok) {
    return { error: 'Too many sign-in attempts. Wait a few minutes and try again.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Generic message — don't leak whether email exists
    return { error: 'Invalid email or password.' }
  }

  let next = safeInternalPath(nextRaw, '')
  const resolveHomeByRole = !next || next === '/dashboard' || next === '/login'

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      const { data } = await admin
        .from('profiles')
        .select('id, school_id, role, full_name, email, phone')
        .eq('id', user.id)
        .maybeSingle()
      const profile = data as Profile | null
      if (profile?.school_id) {
        await recordPilotActivity({
          schoolId: profile.school_id,
          userId: user.id,
          actorRole: effectiveRole(profile) ?? profile.role,
          eventType: 'sign_in',
        })
      }
      if (resolveHomeByRole) {
        const role = effectiveRole(profile)
        next = homePathForRole(role)
      }
    }
  } catch {
    if (resolveHomeByRole) {
      next = '/dashboard'
    }
  }

  redirect(safeInternalPath(next, '/dashboard'))
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

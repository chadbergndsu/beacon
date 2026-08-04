import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveRole, isLeadership, isSchoolStaff } from '@/lib/roles'
import type { Role } from '@/lib/types'
import type { SupabaseClient } from '@supabase/supabase-js'

export type RosterAccess = {
  ok: true
  user: { id: string; email?: string }
  admin: SupabaseClient
  schoolId: string
  profile: {
    id: string
    school_id: string
    role: string
    email: string | null
    full_name: string | null
  }
  role: Role
  isLeadership: boolean
  isTeacher: boolean
}

export type RosterAccessDenied = { ok: false; error: string }

/**
 * Teachers and leadership can manage roster pieces.
 * Teachers are scoped to their own classes (enforced in actions).
 */
export async function requireRosterStaff(): Promise<RosterAccess | RosterAccessDenied> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role, email, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const role = effectiveRole(
    profile
      ? { role: profile.role as Role, email: profile.email as string | null }
      : null
  )

  if (!profile?.school_id || !role || !isSchoolStaff(role)) {
    return {
      ok: false,
      error: 'Only school staff (teachers and leadership) can manage classes and students.',
    }
  }

  return {
    ok: true,
    user,
    admin,
    schoolId: profile.school_id as string,
    profile: profile as RosterAccess['profile'],
    role,
    isLeadership: isLeadership(role),
    isTeacher: role === 'teacher',
  }
}

export async function requireLeadershipRoster(): Promise<
  RosterAccess | RosterAccessDenied
> {
  const access = await requireRosterStaff()
  if (!access.ok) return access
  if (!access.isLeadership) {
    return {
      ok: false,
      error: 'Only principal or admin can do this.',
    }
  }
  return access
}

export async function teacherOwnsClass(
  admin: SupabaseClient,
  schoolId: string,
  classId: string,
  teacherId: string
): Promise<boolean> {
  const { data } = await admin
    .from('classes')
    .select('id')
    .eq('id', classId)
    .eq('school_id', schoolId)
    .eq('teacher_id', teacherId)
    .eq('active', true)
    .maybeSingle()
  return Boolean(data)
}

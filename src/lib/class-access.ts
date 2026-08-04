import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { canEnterGrades, effectiveRole } from '@/lib/roles'
import type { Role } from '@/lib/types'

export async function requireClassManager(classId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false as const, error: 'Not signed in.' }
  }

  const admin = createAdminClient()
  const [{ data: classRow }, { data: profile }] = await Promise.all([
    admin
      .from('classes')
      .select('id, teacher_id, school_id, name')
      .eq('id', classId)
      .maybeSingle(),
    admin
      .from('profiles')
      .select('role, school_id, full_name, email')
      .eq('id', user.id)
      .maybeSingle(),
  ])

  if (!classRow) {
    return { ok: false as const, error: 'Class not found.' }
  }

  const role = effectiveRole(
    profile
      ? { role: profile.role as Role, email: profile.email as string | null }
      : null
  )

  if (
    !canEnterGrades(role, classRow.teacher_id, user.id, {
      profileSchoolId: profile?.school_id as string | null,
      classSchoolId: classRow.school_id as string | null,
    })
  ) {
    return { ok: false as const, error: 'You do not have permission to manage this class.' }
  }

  return { ok: true as const, user, admin, classRow, profile }
}

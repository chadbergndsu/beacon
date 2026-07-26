import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

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
    admin.from('profiles').select('role, school_id').eq('id', user.id).maybeSingle(),
  ])

  if (!classRow) {
    return { ok: false as const, error: 'Class not found.' }
  }

  const allowed =
    profile?.role === 'admin' ||
    profile?.role === 'staff' ||
    profile?.role === 'principal' ||
    (profile?.role === 'teacher' && classRow.teacher_id === user.id)

  if (!allowed) {
    return { ok: false as const, error: 'You do not have permission to manage this class.' }
  }

  return { ok: true as const, user, admin, classRow, profile }
}

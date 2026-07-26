import { createAdminClient } from '@/lib/supabase/admin'

export type Recipient = {
  email: string
  name: string | null
  profile_id?: string
  role?: string
}

/**
 * Resolve announcement audience to email recipients.
 * audience: parents | staff | teachers | all
 * If classId set, parents are limited to that class roster.
 */
export async function resolveAnnouncementRecipients(opts: {
  schoolId: string
  audience: string
  classId?: string | null
}): Promise<Recipient[]> {
  const admin = createAdminClient()
  const audience = (opts.audience || 'parents').toLowerCase()
  const byEmail = new Map<string, Recipient>()

  const add = (r: Recipient) => {
    const email = r.email?.trim().toLowerCase()
    if (!email || !email.includes('@')) return
    if (!byEmail.has(email)) byEmail.set(email, { ...r, email })
  }

  const wantParents = audience === 'parents' || audience === 'all'
  const wantStaff =
    audience === 'staff' || audience === 'teachers' || audience === 'all'

  if (wantParents) {
    let studentIds: string[] = []

    if (opts.classId) {
      const { data: enroll } = await admin
        .from('enrollments')
        .select('student_id')
        .eq('class_id', opts.classId)
      studentIds = (enroll ?? []).map((e) => e.student_id)
    } else {
      const { data: students } = await admin
        .from('students')
        .select('id')
        .eq('school_id', opts.schoolId)
        .eq('active', true)
      studentIds = (students ?? []).map((s) => s.id)
    }

    if (studentIds.length) {
      const { data: links } = await admin
        .from('parent_students')
        .select('parent_id')
        .in('student_id', studentIds)

      const parentIds = [...new Set((links ?? []).map((l) => l.parent_id).filter(Boolean))]
      if (parentIds.length) {
        const { data: parents } = await admin
          .from('profiles')
          .select('id, email, full_name, role')
          .in('id', parentIds)

        for (const p of parents ?? []) {
          if (p.email) {
            add({
              email: p.email,
              name: p.full_name,
              profile_id: p.id,
              role: p.role,
            })
          }
        }
      }
    }
  }

  if (wantStaff) {
    const roles =
      audience === 'teachers'
        ? ['teacher']
        : ['admin', 'staff', 'teacher', 'principal']
    const { data: staff } = await admin
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('school_id', opts.schoolId)
      .in('role', roles)

    for (const p of staff ?? []) {
      if (p.email) {
        add({
          email: p.email,
          name: p.full_name,
          profile_id: p.id,
          role: p.role,
        })
      }
    }
  }

  return [...byEmail.values()]
}

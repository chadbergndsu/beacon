import { createAdminClient } from '@/lib/supabase/admin'

export type Recipient = {
  email: string
  name: string | null
  profile_id?: string
  role?: string
  student_ids?: string[]
}

/**
 * Resolve announcement / compose audience to email recipients.
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
    const existing = byEmail.get(email)
    if (existing) {
      if (r.student_ids?.length) {
        existing.student_ids = [
          ...new Set([...(existing.student_ids || []), ...r.student_ids]),
        ]
      }
      return
    }
    byEmail.set(email, { ...r, email })
  }

  const wantParents = audience === 'parents' || audience === 'all'
  const wantStaff =
    audience === 'staff' || audience === 'teachers' || audience === 'all'

  if (wantParents) {
    let studentIds: string[] = []

    if (opts.classId) {
      // Class must belong to this school (cross-tenant class_id defense)
      const { data: klass } = await admin
        .from('classes')
        .select('id')
        .eq('id', opts.classId)
        .eq('school_id', opts.schoolId)
        .maybeSingle()
      if (!klass) {
        studentIds = []
      } else {
        const { data: enroll } = await admin
          .from('enrollments')
          .select('student_id')
          .eq('class_id', opts.classId)
        studentIds = (enroll ?? []).map((e) => e.student_id)
      }
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
        .select('parent_id, student_id')
        .in('student_id', studentIds)

      const parentIds = [
        ...new Set((links ?? []).map((l) => l.parent_id).filter(Boolean)),
      ]
      if (parentIds.length) {
        const { data: parents } = await admin
          .from('profiles')
          .select('id, email, full_name, role, school_id')
          .in('id', parentIds)
          .eq('school_id', opts.schoolId)

        const studentsByParent = new Map<string, string[]>()
        for (const l of links ?? []) {
          const arr = studentsByParent.get(l.parent_id) || []
          arr.push(l.student_id)
          studentsByParent.set(l.parent_id, arr)
        }

        for (const p of parents ?? []) {
          if (p.email) {
            add({
              email: p.email,
              name: p.full_name,
              profile_id: p.id,
              role: p.role,
              student_ids: studentsByParent.get(p.id) || [],
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

/** Fast count + sample for compose preview (no full send). */
export async function previewRecipients(opts: {
  schoolId: string
  audience: string
  classId?: string | null
}): Promise<{ count: number; sample: string[]; missingParentsNote?: string }> {
  const recipients = await resolveAnnouncementRecipients(opts)
  const sample = recipients.slice(0, 5).map((r) => r.email)
  let missingParentsNote: string | undefined

  if (
    (opts.audience === 'parents' || opts.audience === 'all') &&
    recipients.filter((r) => r.role === 'parent' || r.student_ids?.length).length === 0
  ) {
    missingParentsNote =
      'No parent emails found. Link parent accounts to students and ensure profiles have email addresses.'
  }

  return { count: recipients.length, sample, missingParentsNote }
}

/** Parents linked to one student (for digests / attendance / grades). */
export async function resolveParentsForStudents(
  studentIds: string[],
  schoolId?: string
): Promise<
  Map<
    string,
    { parentId: string; email: string; name: string | null }[]
  >
> {
  const map = new Map<string, { parentId: string; email: string; name: string | null }[]>()
  if (!studentIds.length) return map

  const admin = createAdminClient()
  const { data: links } = await admin
    .from('parent_students')
    .select('parent_id, student_id')
    .in('student_id', studentIds)

  if (!links?.length) return map

  const parentIds = [...new Set(links.map((l) => l.parent_id))]
  let pq = admin.from('profiles').select('id, email, full_name, school_id').in('id', parentIds)
  if (schoolId) pq = pq.eq('school_id', schoolId)
  const { data: parents } = await pq

  const parentById = new Map((parents ?? []).map((p) => [p.id, p]))

  for (const link of links) {
    const p = parentById.get(link.parent_id)
    if (!p?.email) continue
    const arr = map.get(link.student_id) || []
    arr.push({
      parentId: p.id,
      email: p.email.trim().toLowerCase(),
      name: p.full_name,
    })
    map.set(link.student_id, arr)
  }

  return map
}

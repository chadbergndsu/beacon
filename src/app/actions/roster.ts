'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveRole, isLeadership } from '@/lib/roles'
import { parseStudentsCsv } from '@/lib/roster/csv'
import { generateTempPassword, isValidEmail } from '@/lib/roster/password'
import type { Role } from '@/lib/types'

async function requireRosterAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role, email, full_name')
    .eq('id', user.id)
    .maybeSingle()

  const role = effectiveRole(
    profile
      ? {
          role: profile.role as Role,
          email: profile.email as string | null,
        }
      : null
  )

  if (!profile?.school_id || !isLeadership(role)) {
    return {
      ok: false as const,
      error: 'Only principal or admin can manage the school roster.',
    }
  }

  return {
    ok: true as const,
    user,
    admin,
    schoolId: profile.school_id as string,
    profile,
  }
}

function revalidateRoster() {
  revalidatePath('/principal/roster')
  revalidatePath('/dashboard')
  revalidatePath('/principal')
  revalidatePath('/principal/release')
}

/** Create a student (no login). Optionally enroll in a class. */
export async function createStudentAction(input: {
  firstName: string
  lastName: string
  gradeLevel?: string
  classId?: string | null
}): Promise<{ ok: true; studentId: string } | { ok: false; error: string }> {
  const access = await requireRosterAdmin()
  if (!access.ok) return access

  const first_name = input.firstName.trim()
  const last_name = input.lastName.trim()
  if (!first_name || !last_name) {
    return { ok: false, error: 'First and last name are required.' }
  }

  const { data: student, error } = await access.admin
    .from('students')
    .insert({
      school_id: access.schoolId,
      first_name,
      last_name,
      grade_level: input.gradeLevel?.trim() || null,
      active: true,
    })
    .select('id')
    .single()

  if (error || !student) {
    return { ok: false, error: error?.message || 'Could not create student.' }
  }

  if (input.classId) {
    const { data: cls } = await access.admin
      .from('classes')
      .select('id')
      .eq('id', input.classId)
      .eq('school_id', access.schoolId)
      .maybeSingle()
    if (cls) {
      await access.admin.from('enrollments').upsert(
        { student_id: student.id, class_id: cls.id },
        { onConflict: 'student_id,class_id' }
      )
    }
  }

  await access.admin.from('audit_logs').insert({
    school_id: access.schoolId,
    user_id: access.user.id,
    action: 'roster.student_created',
    table_name: 'students',
    record_id: student.id,
    details: { first_name, last_name },
  })

  revalidateRoster()
  return { ok: true, studentId: student.id }
}

/** Bulk import students from CSV text. */
export async function importStudentsCsvAction(
  csvText: string
): Promise<
  | { ok: true; created: number; enrolled: number; errors: string[] }
  | { ok: false; error: string }
> {
  const access = await requireRosterAdmin()
  if (!access.ok) return access

  const parsed = parseStudentsCsv(csvText)
  if (parsed.rows.length === 0) {
    return {
      ok: false,
      error: parsed.errors[0] || 'No students found in CSV.',
    }
  }
  if (parsed.rows.length > 500) {
    return { ok: false, error: 'Please import at most 500 students at a time.' }
  }

  // Load classes for optional class_name matching
  const { data: classes } = await access.admin
    .from('classes')
    .select('id, name')
    .eq('school_id', access.schoolId)
    .eq('active', true)

  const classByName = new Map(
    (classes ?? []).map((c) => [c.name.trim().toLowerCase(), c.id as string])
  )

  let created = 0
  let enrolled = 0
  const errors = [...parsed.errors]

  for (const row of parsed.rows) {
    const { data: student, error } = await access.admin
      .from('students')
      .insert({
        school_id: access.schoolId,
        first_name: row.firstName,
        last_name: row.lastName,
        grade_level: row.gradeLevel,
        active: true,
      })
      .select('id')
      .single()

    if (error || !student) {
      errors.push(
        `Line ${row.line}: ${error?.message || 'insert failed'} (${row.firstName} ${row.lastName})`
      )
      continue
    }
    created++

    if (row.className) {
      const cid = classByName.get(row.className.trim().toLowerCase())
      if (cid) {
        const { error: e2 } = await access.admin.from('enrollments').insert({
          student_id: student.id,
          class_id: cid,
        })
        if (!e2) enrolled++
      } else {
        errors.push(
          `Line ${row.line}: class "${row.className}" not found — student created, not enrolled.`
        )
      }
    }
  }

  await access.admin.from('audit_logs').insert({
    school_id: access.schoolId,
    user_id: access.user.id,
    action: 'roster.students_imported',
    table_name: 'students',
    details: { created, enrolled, error_count: errors.length },
  })

  revalidateRoster()
  return { ok: true, created, enrolled, errors: errors.slice(0, 40) }
}

export async function createClassAction(input: {
  name: string
  subject?: string
  gradeLevel?: string
  teacherId?: string | null
  term?: string
}): Promise<{ ok: true; classId: string } | { ok: false; error: string }> {
  const access = await requireRosterAdmin()
  if (!access.ok) return access

  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Class name is required.' }

  const teacherId = input.teacherId || null
  if (teacherId) {
    const { data: t } = await access.admin
      .from('profiles')
      .select('id, school_id, role')
      .eq('id', teacherId)
      .maybeSingle()
    if (!t || t.school_id !== access.schoolId) {
      return { ok: false, error: 'Teacher not found at this school.' }
    }
  }

  const { data: cls, error } = await access.admin
    .from('classes')
    .insert({
      school_id: access.schoolId,
      name,
      subject: input.subject?.trim() || null,
      grade_level: input.gradeLevel?.trim() || null,
      term: input.term?.trim() || null,
      teacher_id: teacherId,
      active: true,
    })
    .select('id')
    .single()

  if (error || !cls) {
    return { ok: false, error: error?.message || 'Could not create class.' }
  }

  revalidateRoster()
  return { ok: true, classId: cls.id }
}

export async function enrollExistingStudentAction(
  classId: string,
  studentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireRosterAdmin()
  if (!access.ok) return access

  const [{ data: cls }, { data: student }] = await Promise.all([
    access.admin
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('school_id', access.schoolId)
      .maybeSingle(),
    access.admin
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('school_id', access.schoolId)
      .maybeSingle(),
  ])
  if (!cls || !student) return { ok: false, error: 'Class or student not found.' }

  const { error } = await access.admin.from('enrollments').upsert(
    { class_id: classId, student_id: studentId },
    { onConflict: 'student_id,class_id' }
  )
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/classes/${classId}`)
  revalidateRoster()
  return { ok: true }
}

/**
 * Create a login for someone you know (teacher or parent).
 * Returns a one-time temp password to hand to them.
 */
export async function createPersonAccountAction(input: {
  fullName: string
  email: string
  role: 'teacher' | 'parent' | 'staff'
  /** For parents: student ids to link */
  studentIds?: string[]
}): Promise<
  | { ok: true; userId: string; tempPassword: string; email: string }
  | { ok: false; error: string }
> {
  const access = await requireRosterAdmin()
  if (!access.ok) return access

  const full_name = input.fullName.trim()
  const email = input.email.trim().toLowerCase()
  if (!full_name) return { ok: false, error: 'Name is required.' }
  if (!isValidEmail(email)) return { ok: false, error: 'Enter a valid email address.' }

  const role = input.role
  if (role !== 'teacher' && role !== 'parent' && role !== 'staff') {
    return { ok: false, error: 'Invalid role.' }
  }

  const tempPassword = generateTempPassword(12)

  // Prefer matching existing profile by email at this school / any school
  const { data: existingProfile } = await access.admin
    .from('profiles')
    .select('id, school_id, email')
    .ilike('email', email)
    .maybeSingle()

  let userId: string

  if (existingProfile?.id) {
    userId = existingProfile.id as string
    const { error: updErr } = await access.admin.auth.admin.updateUserById(userId, {
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    })
    if (updErr) return { ok: false, error: updErr.message }
  } else {
    const { data: created, error: createErr } = await access.admin.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    })
    if (createErr || !created.user) {
      const msg = createErr?.message || 'Could not create login.'
      if (/already|registered|exists/i.test(msg)) {
        return {
          ok: false,
          error:
            'That email already has a login. Add their profile in Supabase Auth or use a different email.',
        }
      }
      return {
        ok: false,
        error: `${msg} (Service role must be able to create Auth users.)`,
      }
    }
    userId = created.user.id
  }

  const { error: profileErr } = await access.admin.from('profiles').upsert(
    {
      id: userId,
      school_id: access.schoolId,
      role,
      full_name,
      email,
    },
    { onConflict: 'id' }
  )
  if (profileErr) {
    return { ok: false, error: profileErr.message }
  }

  if (role === 'parent' && input.studentIds?.length) {
    for (const sid of input.studentIds) {
      const { data: st } = await access.admin
        .from('students')
        .select('id')
        .eq('id', sid)
        .eq('school_id', access.schoolId)
        .maybeSingle()
      if (!st) continue
      await access.admin.from('parent_students').upsert(
        {
          parent_id: userId,
          student_id: sid,
          relationship: 'parent',
        },
        { onConflict: 'parent_id,student_id' }
      )
    }
  }

  await access.admin.from('audit_logs').insert({
    school_id: access.schoolId,
    user_id: access.user.id,
    action: 'roster.person_account',
    table_name: 'profiles',
    record_id: userId,
    details: { email, role, full_name, linked: input.studentIds?.length ?? 0 },
  })

  revalidateRoster()
  return { ok: true, userId, tempPassword, email }
}

export async function linkParentToStudentAction(
  parentId: string,
  studentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireRosterAdmin()
  if (!access.ok) return access

  const [{ data: parent }, { data: student }] = await Promise.all([
    access.admin
      .from('profiles')
      .select('id, role, school_id')
      .eq('id', parentId)
      .eq('school_id', access.schoolId)
      .maybeSingle(),
    access.admin
      .from('students')
      .select('id')
      .eq('id', studentId)
      .eq('school_id', access.schoolId)
      .maybeSingle(),
  ])
  if (!parent || parent.role !== 'parent') {
    return { ok: false, error: 'Parent account not found.' }
  }
  if (!student) return { ok: false, error: 'Student not found.' }

  const { error } = await access.admin.from('parent_students').upsert(
    { parent_id: parentId, student_id: studentId, relationship: 'parent' },
    { onConflict: 'parent_id,student_id' }
  )
  if (error) return { ok: false, error: error.message }

  revalidateRoster()
  return { ok: true }
}

export async function assignTeacherToClassAction(
  classId: string,
  teacherId: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireRosterAdmin()
  if (!access.ok) return access

  const { data: cls } = await access.admin
    .from('classes')
    .select('id')
    .eq('id', classId)
    .eq('school_id', access.schoolId)
    .maybeSingle()
  if (!cls) return { ok: false, error: 'Class not found.' }

  if (teacherId) {
    const { data: t } = await access.admin
      .from('profiles')
      .select('id, role')
      .eq('id', teacherId)
      .eq('school_id', access.schoolId)
      .maybeSingle()
    if (!t || (t.role !== 'teacher' && t.role !== 'staff' && t.role !== 'admin')) {
      return { ok: false, error: 'Pick a teacher at this school.' }
    }
  }

  const { error } = await access.admin
    .from('classes')
    .update({ teacher_id: teacherId })
    .eq('id', classId)
  if (error) return { ok: false, error: error.message }

  revalidatePath(`/classes/${classId}`)
  revalidateRoster()
  return { ok: true }
}

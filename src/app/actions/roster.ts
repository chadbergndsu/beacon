'use server'

import { revalidatePath } from 'next/cache'
import {
  requireLeadershipRoster,
  requireRosterStaff,
  teacherOwnsClass,
} from '@/lib/roster/access'
import {
  getRevision,
  listRosterRevisions,
  logRosterRevision,
  restoreFromRevision,
} from '@/lib/roster/revisions'
import { parseStudentsCsv } from '@/lib/roster/csv'
import { generateTempPassword, isValidEmail } from '@/lib/roster/password'
import { suggestClassName, subjectsForGrade } from '@/lib/curriculum/abeka'

function revalidateRoster() {
  revalidatePath('/principal/roster')
  revalidatePath('/principal/approvals')
  revalidatePath('/teacher/classroom')
  revalidatePath('/dashboard')
  revalidatePath('/principal')
  revalidatePath('/principal/release')
}

/** Create a student (no login). Teachers must enroll into one of their classes. */
export async function createStudentAction(input: {
  firstName: string
  lastName: string
  gradeLevel?: string
  classId?: string | null
}): Promise<{ ok: true; studentId: string } | { ok: false; error: string }> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  const first_name = input.firstName.trim()
  const last_name = input.lastName.trim()
  if (!first_name || !last_name) {
    return { ok: false, error: 'First and last name are required.' }
  }

  let classId = input.classId || null
  if (access.isTeacher) {
    if (!classId) {
      return {
        ok: false,
        error: 'Pick one of your classes so the student is enrolled with you.',
      }
    }
    const owns = await teacherOwnsClass(
      access.admin,
      access.schoolId,
      classId,
      access.user.id
    )
    if (!owns) {
      return { ok: false, error: 'You can only add students to classes you teach.' }
    }
  } else if (classId) {
    const { data: cls } = await access.admin
      .from('classes')
      .select('id')
      .eq('id', classId)
      .eq('school_id', access.schoolId)
      .maybeSingle()
    if (!cls) classId = null
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
    .select('*')
    .single()

  if (error || !student) {
    return { ok: false, error: error?.message || 'Could not create student.' }
  }

  await logRosterRevision(access.admin, {
    schoolId: access.schoolId,
    entityType: 'student',
    entityId: student.id,
    action: 'create',
    beforeData: null,
    afterData: student as Record<string, unknown>,
    actorId: access.user.id,
    actorRole: access.role,
  })

  if (classId) {
    await access.admin.from('enrollments').upsert(
      { student_id: student.id, class_id: classId },
      { onConflict: 'student_id,class_id' }
    )
    await logRosterRevision(access.admin, {
      schoolId: access.schoolId,
      entityType: 'enrollment',
      entityId: student.id,
      action: 'enroll',
      beforeData: null,
      afterData: { student_id: student.id, class_id: classId },
      actorId: access.user.id,
      actorRole: access.role,
    })
    revalidatePath(`/classes/${classId}`)
  }

  await access.admin.from('audit_logs').insert({
    school_id: access.schoolId,
    user_id: access.user.id,
    action: 'roster.student_created',
    table_name: 'students',
    record_id: student.id,
    details: { first_name, last_name, class_id: classId },
  })

  revalidateRoster()
  return { ok: true, studentId: student.id }
}

/** Bulk import. Teachers only enroll into their classes (by name or defaultClassId). */
export async function importStudentsCsvAction(
  csvText: string,
  opts?: { defaultClassId?: string | null }
): Promise<
  | { ok: true; created: number; enrolled: number; errors: string[] }
  | { ok: false; error: string }
> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  const parsed = parseStudentsCsv(csvText)
  if (parsed.rows.length === 0) {
    return { ok: false, error: parsed.errors[0] || 'No students found in CSV.' }
  }
  if (parsed.rows.length > 500) {
    return { ok: false, error: 'Please import at most 500 students at a time.' }
  }

  let classQuery = access.admin
    .from('classes')
    .select('id, name, teacher_id')
    .eq('school_id', access.schoolId)
    .eq('active', true)
  if (access.isTeacher) {
    classQuery = classQuery.eq('teacher_id', access.user.id)
  }
  const { data: classes } = await classQuery

  const classByName = new Map(
    (classes ?? []).map((c) => [c.name.trim().toLowerCase(), c.id as string])
  )
  const myClassIds = new Set((classes ?? []).map((c) => c.id as string))

  let defaultClassId = opts?.defaultClassId || null
  if (defaultClassId && access.isTeacher && !myClassIds.has(defaultClassId)) {
    return { ok: false, error: 'Default class must be one you teach.' }
  }
  if (access.isTeacher && !defaultClassId && myClassIds.size === 1) {
    defaultClassId = [...myClassIds][0]!
  }

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
      .select('*')
      .single()

    if (error || !student) {
      errors.push(
        `Line ${row.line}: ${error?.message || 'insert failed'} (${row.firstName} ${row.lastName})`
      )
      continue
    }
    created++
    await logRosterRevision(access.admin, {
      schoolId: access.schoolId,
      entityType: 'student',
      entityId: student.id,
      action: 'create',
      afterData: student as Record<string, unknown>,
      actorId: access.user.id,
      actorRole: access.role,
      note: 'CSV import',
    })

    let cid: string | undefined
    if (row.className) {
      cid = classByName.get(row.className.trim().toLowerCase())
      if (!cid) {
        errors.push(
          `Line ${row.line}: class "${row.className}" not found or not yours — student created, not enrolled.`
        )
      }
    } else if (defaultClassId) {
      cid = defaultClassId
    }

    if (cid) {
      const { error: e2 } = await access.admin.from('enrollments').insert({
        student_id: student.id,
        class_id: cid,
      })
      if (!e2) {
        enrolled++
        await logRosterRevision(access.admin, {
          schoolId: access.schoolId,
          entityType: 'enrollment',
          entityId: student.id,
          action: 'enroll',
          afterData: { student_id: student.id, class_id: cid },
          actorId: access.user.id,
          actorRole: access.role,
        })
      }
    } else if (access.isTeacher) {
      errors.push(
        `Line ${row.line}: no class — set CSV "class" column or pick a default class.`
      )
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
  /** Optional school / Abeka section call number (e.g. SCI-301) */
  callNumber?: string | null
}): Promise<{ ok: true; classId: string } | { ok: false; error: string }> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Class name is required.' }
  const call_number = input.callNumber?.trim() || null

  // Teachers always own what they create
  let teacherId: string | null = access.isTeacher
    ? access.user.id
    : input.teacherId || null

  if (teacherId && access.isLeadership) {
    const { data: t } = await access.admin
      .from('profiles')
      .select('id, school_id, role')
      .eq('id', teacherId)
      .maybeSingle()
    if (!t || t.school_id !== access.schoolId) {
      return { ok: false, error: 'Teacher not found at this school.' }
    }
  }

  const row: Record<string, unknown> = {
    school_id: access.schoolId,
    name,
    subject: input.subject?.trim() || null,
    grade_level: input.gradeLevel?.trim() || null,
    term: input.term?.trim() || null,
    teacher_id: teacherId,
    active: true,
  }
  if (call_number) row.call_number = call_number

  let { data: cls, error } = await access.admin
    .from('classes')
    .insert(row)
    .select('*')
    .single()

  // Column may not exist until pending-014 — retry without call_number
  if (error && call_number && /call_number|column/i.test(error.message)) {
    delete row.call_number
    const retry = await access.admin.from('classes').insert(row).select('*').single()
    cls = retry.data
    error = retry.error
  }

  if (error || !cls) {
    return { ok: false, error: error?.message || 'Could not create class.' }
  }

  await logRosterRevision(access.admin, {
    schoolId: access.schoolId,
    entityType: 'class',
    entityId: cls.id,
    action: 'create',
    afterData: cls as Record<string, unknown>,
    actorId: access.user.id,
    actorRole: access.role,
  })

  revalidatePath(`/classes/${cls.id}`)
  revalidateRoster()
  return { ok: true, classId: cls.id }
}

/** Create several Abeka subjects for a grade (teacher self, or principal picks teacher). */
export async function updateClassCallNumberAction(
  classId: string,
  callNumber: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  if (access.isTeacher) {
    const owns = await teacherOwnsClass(
      access.admin,
      access.schoolId,
      classId,
      access.user.id
    )
    if (!owns) return { ok: false, error: 'You can only edit classes you teach.' }
  }

  const { data: before } = await access.admin
    .from('classes')
    .select('*')
    .eq('id', classId)
    .eq('school_id', access.schoolId)
    .maybeSingle()
  if (!before) return { ok: false, error: 'Class not found.' }

  const value = callNumber?.trim() || null
  const { error } = await access.admin
    .from('classes')
    .update({ call_number: value })
    .eq('id', classId)
    .eq('school_id', access.schoolId)

  if (error) {
    if (/call_number|column/i.test(error.message)) {
      return {
        ok: false,
        error: 'Run scripts/pending-014-class-call-number.sql in Supabase first.',
      }
    }
    return { ok: false, error: error.message }
  }

  await logRosterRevision(access.admin, {
    schoolId: access.schoolId,
    entityType: 'class',
    entityId: classId,
    action: 'update',
    beforeData: before as Record<string, unknown>,
    afterData: { ...before, call_number: value },
    actorId: access.user.id,
    actorRole: access.role,
    note: 'Call number update',
  })

  revalidatePath(`/classes/${classId}`)
  revalidateRoster()
  return { ok: true }
}

export async function createAbekaClassesAction(input: {
  gradeId: string
  subjectIds: string[]
  teacherId?: string | null
  term?: string
}): Promise<
  | { ok: true; created: number; skipped: number; classIds: string[] }
  | { ok: false; error: string }
> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  const subjects = subjectsForGrade(input.gradeId).filter((s) =>
    input.subjectIds.includes(s.id)
  )
  if (!subjects.length) {
    return { ok: false, error: 'Pick at least one Abeka subject for this grade.' }
  }

  const teacherId = access.isTeacher
    ? access.user.id
    : input.teacherId || null

  // Existing names to skip duplicates
  let existingQ = access.admin
    .from('classes')
    .select('name')
    .eq('school_id', access.schoolId)
    .eq('active', true)
  if (access.isTeacher) {
    existingQ = existingQ.eq('teacher_id', access.user.id)
  }
  const { data: existing } = await existingQ
  const have = new Set(
    (existing ?? []).map((c) => String(c.name).trim().toLowerCase())
  )

  let created = 0
  let skipped = 0
  const classIds: string[] = []

  for (const sub of subjects) {
    const name = suggestClassName(input.gradeId, sub)
    if (have.has(name.toLowerCase())) {
      skipped++
      continue
    }
    const r = await createClassAction({
      name,
      subject: sub.label,
      gradeLevel: input.gradeId,
      teacherId,
      term: input.term,
    })
    if (r.ok) {
      created++
      classIds.push(r.classId)
      have.add(name.toLowerCase())
    } else {
      skipped++
    }
  }

  revalidateRoster()
  return { ok: true, created, skipped, classIds }
}

export async function enrollExistingStudentAction(
  classId: string,
  studentId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  if (access.isTeacher) {
    const owns = await teacherOwnsClass(
      access.admin,
      access.schoolId,
      classId,
      access.user.id
    )
    if (!owns) {
      return { ok: false, error: 'You can only enroll students into classes you teach.' }
    }
  }

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

  await logRosterRevision(access.admin, {
    schoolId: access.schoolId,
    entityType: 'enrollment',
    entityId: studentId,
    action: 'enroll',
    afterData: { student_id: studentId, class_id: classId },
    actorId: access.user.id,
    actorRole: access.role,
  })

  revalidatePath(`/classes/${classId}`)
  revalidateRoster()
  return { ok: true }
}

/**
 * Create a login for someone you know (teacher or parent). Leadership only.
 */
export async function createPersonAccountAction(input: {
  fullName: string
  email: string
  role: 'teacher' | 'parent' | 'staff'
  studentIds?: string[]
}): Promise<
  | { ok: true; userId: string; tempPassword: string; email: string }
  | { ok: false; error: string }
> {
  const access = await requireLeadershipRoster()
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

  // Only principals/admins (not staff) may create logins
  if (access.role === 'staff') {
    return { ok: false, error: 'Only principal or admin can create user logins.' }
  }

  const { data: existingProfile } = await access.admin
    .from('profiles')
    .select('id, school_id, email, role')
    .ilike('email', email)
    .maybeSingle()

  let userId: string

  if (existingProfile?.id) {
    // Never claim orphan (null school) or foreign-school profiles
    if (!existingProfile.school_id) {
      return {
        ok: false,
        error:
          'That email already has an account without a school assignment. Contact support to attach them — do not reclaim via this form.',
      }
    }
    if (existingProfile.school_id !== access.schoolId) {
      return {
        ok: false,
        error:
          'That email already belongs to another school. Use a different email or contact support.',
      }
    }
    // Never demote principal/admin via this form
    const existingRole = String(existingProfile.role || '')
    if (
      (existingRole === 'principal' || existingRole === 'admin') &&
      String(role) !== existingRole
    ) {
      return {
        ok: false,
        error: `That person is already a ${existingRole}. Change their role in Supabase if needed — not via this form.`,
      }
    }
    // Same school, same person: update name/role carefully, DO NOT reset password by default
    userId = existingProfile.id as string
    const { error: profileErr } = await access.admin
      .from('profiles')
      .update({
        full_name,
        role,
        email,
        school_id: access.schoolId,
      })
      .eq('id', userId)
      .eq('school_id', access.schoolId)
    if (profileErr) return { ok: false, error: profileErr.message }

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

    revalidateRoster()
    return {
      ok: true,
      userId,
      // Existing user: password not reset — return placeholder so UI can show message
      tempPassword: '(unchanged — existing login, password not reset)',
      email,
    }
  }

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
          'That email already has a login. Use their exact email already in the system, or a different address.',
      }
    }
    return {
      ok: false,
      error: `${msg} (Service role must be able to create Auth users.)`,
    }
  }
  userId = created.user.id

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
  const access = await requireRosterStaff()
  if (!access.ok) return access

  if (access.isTeacher) {
    // Teacher may link parents only for students in their classes
    const { data: enroll } = await access.admin
      .from('enrollments')
      .select('class_id, classes!inner(teacher_id)')
      .eq('student_id', studentId)
    const ok = (enroll ?? []).some((e) => {
      const c = e.classes as unknown as { teacher_id?: string } | { teacher_id?: string }[]
      if (Array.isArray(c)) return c.some((x) => x.teacher_id === access.user.id)
      return c?.teacher_id === access.user.id
    })
    // Fallback if join shape differs
    if (!ok) {
      const { data: myClasses } = await access.admin
        .from('classes')
        .select('id')
        .eq('school_id', access.schoolId)
        .eq('teacher_id', access.user.id)
      const ids = (myClasses ?? []).map((c) => c.id)
      if (ids.length) {
        const { data: e2 } = await access.admin
          .from('enrollments')
          .select('class_id')
          .eq('student_id', studentId)
          .in('class_id', ids)
          .limit(1)
        if (!e2?.length) {
          return {
            ok: false,
            error: 'You can only link parents for students in your classes.',
          }
        }
      } else {
        return { ok: false, error: 'Create a class first, then link parents.' }
      }
    }
  }

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
  const access = await requireLeadershipRoster()
  if (!access.ok) return access

  const { data: cls } = await access.admin
    .from('classes')
    .select('*')
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

  await logRosterRevision(access.admin, {
    schoolId: access.schoolId,
    entityType: 'class',
    entityId: classId,
    action: 'assign_teacher',
    beforeData: cls as Record<string, unknown>,
    afterData: { ...cls, teacher_id: teacherId },
    actorId: access.user.id,
    actorRole: access.role,
  })

  revalidatePath(`/classes/${classId}`)
  revalidateRoster()
  return { ok: true }
}

// ─── Deletion approval workflow ─────────────────────────────────────────────

export async function requestDeletionAction(input: {
  kind: 'delete_student' | 'delete_class' | 'unenroll_student'
  entityId: string
  /** For unenroll */
  classId?: string
  reason?: string
}): Promise<{ ok: true; requestId: string; note: string } | { ok: false; error: string }> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  let entityLabel = input.entityId.slice(0, 8)
  let entityType: 'student' | 'class' | 'enrollment' = 'student'
  const payload: Record<string, unknown> = { reason: input.reason || null }

  if (input.kind === 'delete_student') {
    entityType = 'student'
    const { data: st } = await access.admin
      .from('students')
      .select('id, first_name, last_name, active')
      .eq('id', input.entityId)
      .eq('school_id', access.schoolId)
      .maybeSingle()
    if (!st) return { ok: false, error: 'Student not found.' }
    if (access.isTeacher) {
      const { data: myClasses } = await access.admin
        .from('classes')
        .select('id')
        .eq('teacher_id', access.user.id)
        .eq('school_id', access.schoolId)
      const ids = (myClasses ?? []).map((c) => c.id)
      if (!ids.length) return { ok: false, error: 'No classes to manage.' }
      const { data: en } = await access.admin
        .from('enrollments')
        .select('class_id')
        .eq('student_id', input.entityId)
        .in('class_id', ids)
        .limit(1)
      if (!en?.length) {
        return { ok: false, error: 'You can only request deletion for students in your classes.' }
      }
    }
    entityLabel = `${st.first_name} ${st.last_name}`
  } else if (input.kind === 'delete_class') {
    entityType = 'class'
    const { data: cls } = await access.admin
      .from('classes')
      .select('id, name, teacher_id, active')
      .eq('id', input.entityId)
      .eq('school_id', access.schoolId)
      .maybeSingle()
    if (!cls) return { ok: false, error: 'Class not found.' }
    if (access.isTeacher && cls.teacher_id !== access.user.id) {
      return { ok: false, error: 'You can only request deletion for classes you teach.' }
    }
    entityLabel = cls.name as string
  } else {
    entityType = 'enrollment'
    const classId = input.classId
    if (!classId) return { ok: false, error: 'classId required for unenroll request.' }
    if (access.isTeacher) {
      const owns = await teacherOwnsClass(
        access.admin,
        access.schoolId,
        classId,
        access.user.id
      )
      if (!owns) return { ok: false, error: 'Not your class.' }
    }
    const [{ data: st }, { data: cls }] = await Promise.all([
      access.admin
        .from('students')
        .select('first_name, last_name')
        .eq('id', input.entityId)
        .eq('school_id', access.schoolId)
        .maybeSingle(),
      access.admin
        .from('classes')
        .select('name')
        .eq('id', classId)
        .eq('school_id', access.schoolId)
        .maybeSingle(),
    ])
    if (!st || !cls) return { ok: false, error: 'Student or class not found at this school.' }
    entityLabel = `${st.first_name} ${st.last_name} from ${cls.name}`
    payload.class_id = classId
    payload.student_id = input.entityId
  }

  // Leadership can execute immediately instead of queueing
  if (access.isLeadership && input.kind !== 'unenroll_student') {
    const applied = await applyDeletion(
      access,
      input.kind,
      input.entityId,
      payload
    )
    if (!applied.ok) return applied
    return {
      ok: true,
      requestId: 'immediate',
      note: 'Leadership delete applied immediately (logged for undo).',
    }
  }

  if (access.isLeadership && input.kind === 'unenroll_student') {
    const applied = await applyDeletion(
      access,
      input.kind,
      input.entityId,
      payload
    )
    if (!applied.ok) return applied
    return {
      ok: true,
      requestId: 'immediate',
      note: 'Student unenrolled (logged for undo).',
    }
  }

  // Cancel duplicate pending (unenroll: same student+class only)
  let cancelQ = access.admin
    .from('approval_requests')
    .update({ status: 'cancelled' })
    .eq('school_id', access.schoolId)
    .eq('entity_id', input.entityId)
    .eq('kind', input.kind)
    .eq('status', 'pending')
  // Note: payload class_id filter via fetch+cancel is safer for unenroll
  if (input.kind === 'unenroll_student' && input.classId) {
    const { data: pendingUnenrolls } = await access.admin
      .from('approval_requests')
      .select('id, payload')
      .eq('school_id', access.schoolId)
      .eq('entity_id', input.entityId)
      .eq('kind', 'unenroll_student')
      .eq('status', 'pending')
    const ids = (pendingUnenrolls ?? [])
      .filter((r) => (r.payload as { class_id?: string })?.class_id === input.classId)
      .map((r) => r.id as string)
    if (ids.length) {
      await access.admin
        .from('approval_requests')
        .update({ status: 'cancelled' })
        .in('id', ids)
    }
  } else {
    await cancelQ
  }

  const { data: req, error } = await access.admin
    .from('approval_requests')
    .insert({
      school_id: access.schoolId,
      kind: input.kind,
      entity_type: entityType,
      entity_id: input.entityId,
      entity_label: entityLabel.trim(),
      payload,
      requested_by: access.user.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (error || !req) {
    if (/does not exist|schema cache|relation/i.test(error?.message || '')) {
      return {
        ok: false,
        error:
          'Approval tables missing. Run scripts/pending-013-roster-versions.sql in Supabase.',
      }
    }
    return { ok: false, error: error?.message || 'Could not create approval request.' }
  }

  revalidateRoster()
  return {
    ok: true,
    requestId: req.id,
    note: 'Sent to principal for approval. Nothing deleted yet.',
  }
}

type RosterStaffOk = Extract<Awaited<ReturnType<typeof requireRosterStaff>>, { ok: true }>

async function applyDeletion(
  access: RosterStaffOk,
  kind: 'delete_student' | 'delete_class' | 'unenroll_student',
  entityId: string,
  payload: Record<string, unknown>
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (kind === 'delete_student') {
    const { data: before } = await access.admin
      .from('students')
      .select('*')
      .eq('id', entityId)
      .eq('school_id', access.schoolId)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Student not found.' }
    const { error } = await access.admin
      .from('students')
      .update({ active: false })
      .eq('id', entityId)
    if (error) return { ok: false, error: error.message }
    await logRosterRevision(access.admin, {
      schoolId: access.schoolId,
      entityType: 'student',
      entityId,
      action: 'soft_delete',
      beforeData: before as Record<string, unknown>,
      afterData: { ...before, active: false },
      actorId: access.user.id,
      actorRole: access.role,
      note: 'Soft-deleted (can restore from history)',
    })
    return { ok: true }
  }

  if (kind === 'delete_class') {
    const { data: before } = await access.admin
      .from('classes')
      .select('*')
      .eq('id', entityId)
      .eq('school_id', access.schoolId)
      .maybeSingle()
    if (!before) return { ok: false, error: 'Class not found.' }
    const { error } = await access.admin
      .from('classes')
      .update({ active: false })
      .eq('id', entityId)
    if (error) return { ok: false, error: error.message }
    await logRosterRevision(access.admin, {
      schoolId: access.schoolId,
      entityType: 'class',
      entityId,
      action: 'soft_delete',
      beforeData: before as Record<string, unknown>,
      afterData: { ...before, active: false },
      actorId: access.user.id,
      actorRole: access.role,
      note: 'Class archived (can restore from history)',
    })
    return { ok: true }
  }

  const classId = String(payload.class_id || '')
  const studentId = String(payload.student_id || entityId)
  if (!classId) return { ok: false, error: 'Missing class for unenroll.' }
  // School-scope both sides
  const [{ data: cls }, { data: st }] = await Promise.all([
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
  if (!cls || !st) return { ok: false, error: 'Student or class not found at this school.' }
  const { error } = await access.admin
    .from('enrollments')
    .delete()
    .eq('student_id', studentId)
    .eq('class_id', classId)
  if (error) return { ok: false, error: error.message }
  await logRosterRevision(access.admin, {
    schoolId: access.schoolId,
    entityType: 'enrollment',
    entityId: studentId,
    action: 'unenroll',
    beforeData: { student_id: studentId, class_id: classId },
    afterData: null,
    actorId: access.user.id,
    actorRole: access.role,
  })
  revalidatePath(`/classes/${classId}`)
  return { ok: true }
}

export async function reviewApprovalAction(input: {
  requestId: string
  decision: 'approved' | 'rejected'
  note?: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireLeadershipRoster()
  if (!access.ok) return access

  const { data: req, error } = await access.admin
    .from('approval_requests')
    .select('*')
    .eq('id', input.requestId)
    .eq('school_id', access.schoolId)
    .maybeSingle()

  if (error || !req) {
    return {
      ok: false,
      error: error?.message || 'Request not found. Run pending-013-roster-versions.sql?',
    }
  }
  if (req.status !== 'pending') {
    return { ok: false, error: `Request already ${req.status}.` }
  }

  // CAS: claim pending → decision first so concurrent reviewers don't double-apply
  const { data: claimed, error: claimErr } = await access.admin
    .from('approval_requests')
    .update({
      status: input.decision,
      reviewer_id: access.user.id,
      review_note: input.note?.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', input.requestId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()

  if (claimErr) return { ok: false, error: claimErr.message }
  if (!claimed) {
    return { ok: false, error: 'Request already reviewed by someone else.' }
  }

  if (input.decision === 'approved') {
    const applied = await applyDeletion(
      access,
      req.kind as 'delete_student' | 'delete_class' | 'unenroll_student',
      req.entity_id as string,
      (req.payload || {}) as Record<string, unknown>
    )
    if (!applied.ok) {
      // Leave decision as approved with note; entity may already be inactive
      return { ok: false, error: applied.error }
    }
  }

  revalidateRoster()
  return { ok: true }
}

export async function cancelApprovalAction(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  let q = access.admin
    .from('approval_requests')
    .update({ status: 'cancelled' })
    .eq('id', requestId)
    .eq('school_id', access.schoolId)
    .eq('status', 'pending')

  if (!access.isLeadership) {
    q = q.eq('requested_by', access.user.id)
  }

  const { error } = await q
  if (error) return { ok: false, error: error.message }
  revalidateRoster()
  return { ok: true }
}

export async function restoreRevisionAction(
  revisionId: string
): Promise<{ ok: true; note: string } | { ok: false; error: string }> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  // Teachers can restore their own recent mistakes; leadership any
  const rev = await getRevision(access.admin, access.schoolId, revisionId)
  if (!rev) {
    return {
      ok: false,
      error: 'Revision not found. Run pending-013-roster-versions.sql if tables are missing.',
    }
  }

  if (access.isTeacher) {
    if (rev.actorId !== access.user.id) {
      return {
        ok: false,
        error: 'Teachers can only undo their own changes. Ask principal for broader restore.',
      }
    }
    // Undo-create soft-deletes school-wide — force approval path instead
    if (rev.action === 'create' && rev.entityType === 'student') {
      return {
        ok: false,
        error:
          'Cannot undo student create (would remove school-wide). Use Request delete for principal approval.',
      }
    }
    if (rev.entityType === 'class') {
      const owns = await teacherOwnsClass(
        access.admin,
        access.schoolId,
        rev.entityId,
        access.user.id
      )
      if (!owns && rev.action !== 'soft_delete') {
        return { ok: false, error: 'Not your class.' }
      }
    }
    if (rev.entityType === 'student' && rev.action === 'soft_delete') {
      // Only restore soft-delete if student is still only in teacher's classes? Allow restore of own soft-delete only for leadership; teachers shouldn't soft-delete without approval
      return {
        ok: false,
        error: 'Only principal can restore soft-deleted students.',
      }
    }
  }

  const r = await restoreFromRevision(access.admin, rev, {
    id: access.user.id,
    role: access.role,
  })
  if (!r.ok) return r

  revalidateRoster()
  if (rev.entityType === 'class') revalidatePath(`/classes/${rev.entityId}`)
  return { ok: true, note: 'Restored from history. A new revision was logged.' }
}

export async function listRevisionsAction(): Promise<
  | { ok: true; revisions: Awaited<ReturnType<typeof listRosterRevisions>> }
  | { ok: false; error: string }
> {
  const access = await requireRosterStaff()
  if (!access.ok) return access
  let revisions = await listRosterRevisions(access.admin, access.schoolId, 50)
  if (access.isTeacher) {
    revisions = revisions.filter((r) => r.actorId === access.user.id)
  }
  return { ok: true, revisions }
}

export async function listPendingApprovalsAction(): Promise<
  | {
      ok: true
      requests: {
        id: string
        kind: string
        entityLabel: string
        entityId: string
        status: string
        requestedBy: string
        createdAt: string
        payload: Record<string, unknown>
      }[]
    }
  | { ok: false; error: string }
> {
  const access = await requireRosterStaff()
  if (!access.ok) return access

  let q = access.admin
    .from('approval_requests')
    .select('*')
    .eq('school_id', access.schoolId)
    .order('created_at', { ascending: false })
    .limit(40)

  if (access.isTeacher) {
    q = q.eq('requested_by', access.user.id)
  } else {
    q = q.in('status', ['pending', 'approved', 'rejected'])
  }

  const { data, error } = await q
  if (error) {
    if (/does not exist|schema cache/i.test(error.message)) {
      return { ok: true, requests: [] }
    }
    return { ok: false, error: error.message }
  }

  return {
    ok: true,
    requests: (data ?? []).map((r) => ({
      id: String(r.id),
      kind: String(r.kind),
      entityLabel: String(r.entity_label || ''),
      entityId: String(r.entity_id),
      status: String(r.status),
      requestedBy: String(r.requested_by),
      createdAt: String(r.created_at),
      payload: (r.payload || {}) as Record<string, unknown>,
    })),
  }
}

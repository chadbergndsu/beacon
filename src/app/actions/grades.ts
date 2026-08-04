'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyParentsOfGradeSave } from '@/lib/email/grade-notify'
import { canEnterGrades, effectiveRole } from '@/lib/roles'
import type { Grade, Role } from '@/lib/types'

export async function saveGrades(
  classId: string,
  grades: Grade[],
  options?: { notifyParents?: boolean }
): Promise<
  { ok: true; notifyNote?: string; dropped?: number } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: 'Not signed in.' }
  }

  const admin = createAdminClient()
  const { data: classRow } = await admin
    .from('classes')
    .select('id, name, teacher_id, school_id')
    .eq('id', classId)
    .maybeSingle()

  if (!classRow) {
    return { ok: false, error: 'Class not found.' }
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role, school_id, email')
    .eq('id', user.id)
    .maybeSingle()

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
    return { ok: false, error: 'You do not have permission to save grades for this class.' }
  }
  // Ensure teacher/leadership always pass school ids for ACL (fail closed if missing)

  if (grades.length === 0) {
    return { ok: true }
  }

  const { gradesBatchSchema } = await import('@/lib/validation/schemas')
  const validated = gradesBatchSchema.safeParse(
    grades.map((g) => ({
      assignment_id: g.assignment_id,
      student_id: g.student_id,
      score: g.is_missing ? null : g.score,
      is_missing: Boolean(g.is_missing),
      is_late: g.is_late ?? false,
      comments: g.comments ?? null,
    }))
  )
  if (!validated.success) {
    return {
      ok: false,
      error: validated.error.issues[0]?.message || 'Invalid grade data.',
    }
  }

  // Bind every grade row to this class's assignments + enrolled students
  const assignmentIds = [...new Set(validated.data.map((g) => g.assignment_id))]
  const studentIds = [...new Set(validated.data.map((g) => g.student_id))]

  const [{ data: validAssignments }, { data: enrollments }] = await Promise.all([
    admin.from('assignments').select('id').eq('class_id', classId).in('id', assignmentIds),
    admin
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .in('student_id', studentIds),
  ])

  const okAssignments = new Set((validAssignments ?? []).map((a) => a.id as string))
  const okStudents = new Set((enrollments ?? []).map((e) => e.student_id as string))

  const rows = validated.data
    .filter((g) => okAssignments.has(g.assignment_id) && okStudents.has(g.student_id))
    .map((g) => ({
      assignment_id: g.assignment_id,
      student_id: g.student_id,
      score: g.is_missing ? null : g.score,
      is_missing: g.is_missing,
      is_late: g.is_late ?? false,
      comments: g.comments ?? null,
      entered_by: user.id,
      entered_at: new Date().toISOString(),
    }))

  if (rows.length === 0) {
    return {
      ok: false,
      error: 'No valid grades for this class (assignment or student not in class).',
    }
  }

  const { error } = await admin.from('grades').upsert(rows, {
    onConflict: 'assignment_id,student_id',
  })

  if (error) {
    const { toClientError } = await import('@/lib/errors/client-error')
    return { ok: false, error: toClientError(error.message) }
  }

  await admin.from('audit_logs').insert({
    school_id: classRow.school_id,
    user_id: user.id,
    action: 'grades.saved',
    table_name: 'grades',
    record_id: classId,
    details: {
      count: rows.length,
      dropped: grades.length - rows.length,
      notifyParents: Boolean(options?.notifyParents),
      student_ids: [...new Set(rows.map((r) => r.student_id))],
    },
  })

  let notifyNote: string | undefined
  if (options?.notifyParents) {
    const studentIdsNotify = [...new Set(rows.map((r) => r.student_id))]
    const result = await notifyParentsOfGradeSave({
      classId,
      schoolId: classRow.school_id as string,
      className: classRow.name as string,
      studentIds: studentIdsNotify,
    })
    notifyNote =
      result.sent > 0
        ? `Parent notices: ${result.sent} email(s).${result.note ? ' ' + result.note : ''}`
        : result.note || 'No parent emails to notify.'
  }

  const dropped = grades.length - rows.length
  revalidatePath(`/classes/${classId}`)
  revalidatePath(`/classes/${classId}`, 'layout')
  revalidatePath('/admin/emails')
  let note = notifyNote
  if (dropped > 0) {
    const dropMsg = `${dropped} row(s) skipped (not on class roster/assignments).`
    note = note ? `${note} ${dropMsg}` : dropMsg
  }
  return { ok: true, notifyNote: note, dropped: dropped > 0 ? dropped : undefined }
}

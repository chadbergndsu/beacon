'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notifyParentsOfGradeSave } from '@/lib/email/grade-notify'
import type { Grade } from '@/lib/types'

export async function saveGrades(
  classId: string,
  grades: Grade[],
  options?: { notifyParents?: boolean }
): Promise<{ ok: true; notifyNote?: string } | { ok: false; error: string }> {
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
    .select('role, school_id')
    .eq('id', user.id)
    .maybeSingle()

  const allowed =
    profile?.role === 'admin' ||
    profile?.role === 'staff' ||
    profile?.role === 'principal' ||
    (profile?.role === 'teacher' && classRow.teacher_id === user.id)

  if (!allowed) {
    return { ok: false, error: 'You do not have permission to save grades for this class.' }
  }

  const rows = grades.map((g) => ({
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
    return { ok: true }
  }

  const { error } = await admin.from('grades').upsert(rows, {
    onConflict: 'assignment_id,student_id',
  })

  if (error) {
    return { ok: false, error: error.message }
  }

  await admin.from('audit_logs').insert({
    school_id: classRow.school_id,
    user_id: user.id,
    action: 'grades.saved',
    table_name: 'grades',
    record_id: classId,
    details: {
      count: rows.length,
      notifyParents: Boolean(options?.notifyParents),
      student_ids: [...new Set(rows.map((r) => r.student_id))],
    },
  })

  let notifyNote: string | undefined
  if (options?.notifyParents) {
    const studentIds = [...new Set(rows.map((r) => r.student_id))]
    const result = await notifyParentsOfGradeSave({
      classId,
      schoolId: classRow.school_id,
      className: classRow.name,
      studentIds,
    })
    notifyNote =
      result.sent > 0
        ? `Parent notices: ${result.sent} email(s).${result.note ? ' ' + result.note : ''}`
        : result.note || 'No parent emails to notify.'
  }

  revalidatePath(`/classes/${classId}`)
  revalidatePath(`/classes/${classId}`, 'layout')
  revalidatePath('/admin/emails')
  return { ok: true, notifyNote }
}

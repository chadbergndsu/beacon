import type { SupabaseClient } from '@supabase/supabase-js'

export type RosterEntityType = 'student' | 'class' | 'enrollment'
export type RosterRevisionAction =
  | 'create'
  | 'update'
  | 'soft_delete'
  | 'restore'
  | 'enroll'
  | 'unenroll'
  | 'assign_teacher'

export type RosterRevision = {
  id: string
  schoolId: string
  entityType: RosterEntityType
  entityId: string
  action: RosterRevisionAction
  beforeData: Record<string, unknown> | null
  afterData: Record<string, unknown> | null
  actorId: string | null
  actorRole: string | null
  note: string | null
  createdAt: string
}

export async function logRosterRevision(
  admin: SupabaseClient,
  input: {
    schoolId: string
    entityType: RosterEntityType
    entityId: string
    action: RosterRevisionAction
    beforeData?: Record<string, unknown> | null
    afterData?: Record<string, unknown> | null
    actorId?: string | null
    actorRole?: string | null
    note?: string | null
  }
): Promise<void> {
  try {
    await admin.from('roster_revisions').insert({
      school_id: input.schoolId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      before_data: input.beforeData ?? null,
      after_data: input.afterData ?? null,
      actor_id: input.actorId ?? null,
      actor_role: input.actorRole ?? null,
      note: input.note ?? null,
    })
  } catch {
    // Table may not exist yet — never block the primary action
  }
}

export async function listRosterRevisions(
  admin: SupabaseClient,
  schoolId: string,
  limit = 40
): Promise<RosterRevision[]> {
  const { data, error } = await admin
    .from('roster_revisions')
    .select('*')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error || !data) return []

  return data.map((r) => ({
    id: String(r.id),
    schoolId: String(r.school_id),
    entityType: r.entity_type as RosterEntityType,
    entityId: String(r.entity_id),
    action: r.action as RosterRevisionAction,
    beforeData: (r.before_data as Record<string, unknown>) || null,
    afterData: (r.after_data as Record<string, unknown>) || null,
    actorId: (r.actor_id as string) || null,
    actorRole: (r.actor_role as string) || null,
    note: (r.note as string) || null,
    createdAt: String(r.created_at),
  }))
}

export async function getRevision(
  admin: SupabaseClient,
  schoolId: string,
  revisionId: string
): Promise<RosterRevision | null> {
  const { data, error } = await admin
    .from('roster_revisions')
    .select('*')
    .eq('id', revisionId)
    .eq('school_id', schoolId)
    .maybeSingle()
  if (error || !data) return null
  return {
    id: String(data.id),
    schoolId: String(data.school_id),
    entityType: data.entity_type as RosterEntityType,
    entityId: String(data.entity_id),
    action: data.action as RosterRevisionAction,
    beforeData: (data.before_data as Record<string, unknown>) || null,
    afterData: (data.after_data as Record<string, unknown>) || null,
    actorId: (data.actor_id as string) || null,
    actorRole: (data.actor_role as string) || null,
    note: (data.note as string) || null,
    createdAt: String(data.created_at),
  }
}

/** Apply before_data for student/class soft restore or reverse enroll. */
export async function restoreFromRevision(
  admin: SupabaseClient,
  rev: RosterRevision,
  actor: { id: string; role: string }
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (rev.entityType === 'student') {
    const before = rev.beforeData
    if (rev.action === 'create') {
      // Undo create → soft deactivate
      const { data: cur } = await admin
        .from('students')
        .select('*')
        .eq('id', rev.entityId)
        .maybeSingle()
      await admin
        .from('students')
        .update({ active: false })
        .eq('id', rev.entityId)
        .eq('school_id', rev.schoolId)
      await logRosterRevision(admin, {
        schoolId: rev.schoolId,
        entityType: 'student',
        entityId: rev.entityId,
        action: 'soft_delete',
        beforeData: (cur as Record<string, unknown>) || null,
        afterData: { active: false },
        actorId: actor.id,
        actorRole: actor.role,
        note: `Undo create via revision ${rev.id}`,
      })
      return { ok: true }
    }
    if (rev.action === 'soft_delete' || rev.action === 'update' || rev.action === 'restore') {
      if (!before) return { ok: false, error: 'No snapshot to restore for this student change.' }
      const patch = {
        first_name: before.first_name,
        last_name: before.last_name,
        grade_level: before.grade_level ?? null,
        active: before.active !== false,
      }
      const { data: cur } = await admin
        .from('students')
        .select('*')
        .eq('id', rev.entityId)
        .maybeSingle()
      const { error } = await admin
        .from('students')
        .update(patch)
        .eq('id', rev.entityId)
        .eq('school_id', rev.schoolId)
      if (error) return { ok: false, error: error.message }
      await logRosterRevision(admin, {
        schoolId: rev.schoolId,
        entityType: 'student',
        entityId: rev.entityId,
        action: 'restore',
        beforeData: (cur as Record<string, unknown>) || null,
        afterData: patch,
        actorId: actor.id,
        actorRole: actor.role,
        note: `Restored from revision ${rev.id}`,
      })
      return { ok: true }
    }
  }

  if (rev.entityType === 'class') {
    if (rev.action === 'create') {
      const { data: cur } = await admin
        .from('classes')
        .select('*')
        .eq('id', rev.entityId)
        .maybeSingle()
      await admin
        .from('classes')
        .update({ active: false })
        .eq('id', rev.entityId)
        .eq('school_id', rev.schoolId)
      await logRosterRevision(admin, {
        schoolId: rev.schoolId,
        entityType: 'class',
        entityId: rev.entityId,
        action: 'soft_delete',
        beforeData: (cur as Record<string, unknown>) || null,
        afterData: { active: false },
        actorId: actor.id,
        actorRole: actor.role,
        note: `Undo class create via revision ${rev.id}`,
      })
      return { ok: true }
    }
    if (
      rev.action === 'soft_delete' ||
      rev.action === 'update' ||
      rev.action === 'restore' ||
      rev.action === 'assign_teacher'
    ) {
      const before = rev.beforeData
      if (!before) return { ok: false, error: 'No snapshot to restore for this class change.' }
      const patch = {
        name: before.name,
        subject: before.subject ?? null,
        grade_level: before.grade_level ?? null,
        teacher_id: before.teacher_id ?? null,
        term: before.term ?? null,
        active: before.active !== false,
      }
      const { data: cur } = await admin
        .from('classes')
        .select('*')
        .eq('id', rev.entityId)
        .maybeSingle()
      const { error } = await admin
        .from('classes')
        .update(patch)
        .eq('id', rev.entityId)
        .eq('school_id', rev.schoolId)
      if (error) return { ok: false, error: error.message }
      await logRosterRevision(admin, {
        schoolId: rev.schoolId,
        entityType: 'class',
        entityId: rev.entityId,
        action: 'restore',
        beforeData: (cur as Record<string, unknown>) || null,
        afterData: patch,
        actorId: actor.id,
        actorRole: actor.role,
        note: `Restored from revision ${rev.id}`,
      })
      return { ok: true }
    }
  }

  if (rev.entityType === 'enrollment') {
    const payload = rev.afterData || rev.beforeData || {}
    const studentId = String(payload.student_id || '')
    const classId = String(payload.class_id || '')
    if (!studentId || !classId) {
      return { ok: false, error: 'Enrollment revision missing student/class.' }
    }
    if (rev.action === 'enroll') {
      await admin
        .from('enrollments')
        .delete()
        .eq('student_id', studentId)
        .eq('class_id', classId)
      await logRosterRevision(admin, {
        schoolId: rev.schoolId,
        entityType: 'enrollment',
        entityId: rev.entityId,
        action: 'unenroll',
        beforeData: { student_id: studentId, class_id: classId },
        afterData: null,
        actorId: actor.id,
        actorRole: actor.role,
        note: `Undo enroll via revision ${rev.id}`,
      })
      return { ok: true }
    }
    if (rev.action === 'unenroll') {
      await admin.from('enrollments').upsert(
        { student_id: studentId, class_id: classId },
        { onConflict: 'student_id,class_id' }
      )
      await logRosterRevision(admin, {
        schoolId: rev.schoolId,
        entityType: 'enrollment',
        entityId: rev.entityId,
        action: 'enroll',
        beforeData: null,
        afterData: { student_id: studentId, class_id: classId },
        actorId: actor.id,
        actorRole: actor.role,
        note: `Undo unenroll via revision ${rev.id}`,
      })
      return { ok: true }
    }
  }

  return { ok: false, error: 'This revision type cannot be auto-restored yet.' }
}

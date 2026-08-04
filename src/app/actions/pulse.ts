'use server'

import { revalidatePath } from 'next/cache'
import { requireClassManager } from '@/lib/class-access'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  addPulse,
  listAllPulses,
  listPulsesForClass,
  listPulsesForStudent,
} from '@/lib/school-modules/store'
import type { PulseDimension, PulseEntry, PulseLevel } from '@/lib/school-modules/types'
import { isLeadership } from '@/lib/roles'

export async function submitPulse(
  classId: string,
  input: {
    studentId: string
    overall: PulseLevel
    dimensions: Partial<Record<PulseDimension, PulseLevel>>
    note: string
    celebrate?: string
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access

  if (!input.studentId) return { ok: false, error: 'Select a student.' }
  if (!input.overall) return { ok: false, error: 'Choose an overall pulse.' }

  // Bind student to this class roster + school (integrity / parent-feed safety)
  const adminCheck = createAdminClient()
  const { data: enrolled } = await adminCheck
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('student_id', input.studentId)
    .maybeSingle()
  if (!enrolled) {
    return { ok: false, error: 'Student is not on this class roster.' }
  }
  const { data: studentRow } = await adminCheck
    .from('students')
    .select('id')
    .eq('id', input.studentId)
    .eq('school_id', access.classRow.school_id)
    .maybeSingle()
  if (!studentRow) {
    return { ok: false, error: 'Student not found at your school.' }
  }

  const entry: PulseEntry = {
    id: `pulse_${Date.now().toString(36)}`,
    classId,
    studentId: input.studentId,
    teacherId: access.user.id,
    teacherName: access.profile?.full_name || 'Teacher',
    date: new Date().toISOString().slice(0, 10),
    overall: input.overall,
    dimensions: input.dimensions || {},
    note: input.note.trim(),
    celebrate: input.celebrate?.trim() || '',
    createdAt: new Date().toISOString(),
  }

  await addPulse(access.classRow.school_id, entry)

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: access.classRow.school_id,
    user_id: access.user.id,
    action: 'pulse.created',
    table_name: 'beacon_pulse',
    details: {
      studentId: entry.studentId,
      overall: entry.overall,
      classId,
    },
  })

  revalidatePath(`/classes/${classId}`)
  revalidatePath(`/students/${input.studentId}`)
  revalidatePath('/principal/pulse')
  return { ok: true }
}

export async function getClassPulses(classId: string) {
  const access = await requireClassManager(classId)
  if (!access.ok) return []
  return listPulsesForClass(access.classRow.school_id, classId)
}

export async function getStudentPulsesForViewer(studentId: string) {
  const { profile, user } = await getProfile()
  if (!profile?.school_id) return []

  const admin = createAdminClient()
  // Parent can only view linked children
  if (profile.role === 'parent') {
    const { data } = await admin
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', user.id)
      .eq('student_id', studentId)
      .maybeSingle()
    if (!data) return []
  } else if (profile.role === 'teacher') {
    const { data: classes } = await admin
      .from('classes')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('school_id', profile.school_id)
    const classIds = (classes ?? []).map((c) => c.id)
    if (!classIds.length) return []
    const { data: enroll } = await admin
      .from('enrollments')
      .select('student_id')
      .eq('student_id', studentId)
      .in('class_id', classIds)
      .limit(1)
    if (!enroll?.length) return []
  } else if (!isLeadership(profile.role)) {
    return []
  }

  return listPulsesForStudent(profile.school_id, studentId)
}

export async function getPrincipalPulseBoard() {
  const { profile } = await getProfile()
  if (!profile?.school_id || !isLeadership(profile.role)) {
    return { pulses: [] as PulseEntry[], error: 'Unauthorized' }
  }
  const pulses = await listAllPulses(profile.school_id)
  return { pulses }
}

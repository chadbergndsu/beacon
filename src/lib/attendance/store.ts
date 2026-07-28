import { createAdminClient } from '@/lib/supabase/admin'
import type { AttendanceRecord, AttendanceStatus } from '@/lib/attendance/types'

function mapRow(r: Record<string, unknown>): AttendanceRecord {
  return {
    id: String(r.id),
    schoolId: String(r.school_id),
    classId: String(r.class_id),
    studentId: String(r.student_id),
    date: String(r.date),
    status: r.status as AttendanceStatus,
    note: (r.note as string) || undefined,
    markedBy: (r.marked_by as string) || undefined,
  }
}

export async function loadAttendanceForClassDate(
  classId: string,
  date: string
): Promise<AttendanceRecord[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('attendance')
    .select('*')
    .eq('class_id', classId)
    .eq('date', date)

  if (error) {
    // Table may not exist yet — fall back to settings JSON
    return loadAttendanceFallback(classId, date)
  }
  return (data ?? []).map((r) => mapRow(r as Record<string, unknown>))
}

async function loadAttendanceFallback(classId: string, date: string) {
  const admin = createAdminClient()
  const { data: klass } = await admin
    .from('classes')
    .select('school_id')
    .eq('id', classId)
    .maybeSingle()
  if (!klass?.school_id) return []

  const { data: school } = await admin
    .from('schools')
    .select('settings')
    .eq('id', klass.school_id)
    .maybeSingle()

  const settings = (school?.settings || {}) as {
    attendance?: AttendanceRecord[]
  }
  return (settings.attendance ?? []).filter(
    (a) => a.classId === classId && a.date === date
  )
}

export async function upsertAttendanceBatch(
  schoolId: string,
  classId: string,
  date: string,
  rows: { studentId: string; status: AttendanceStatus; note?: string }[],
  markedBy: string
): Promise<{ usedTable: boolean }> {
  const admin = createAdminClient()
  const payload = rows.map((r) => ({
    school_id: schoolId,
    class_id: classId,
    student_id: r.studentId,
    date,
    status: r.status,
    note: r.note || null,
    marked_by: markedBy,
    updated_at: new Date().toISOString(),
  }))

  const { error } = await admin.from('attendance').upsert(payload, {
    onConflict: 'class_id,student_id,date',
  })

  if (!error) return { usedTable: true }

  // Fallback JSON
  const { data: school } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()
  const settings = { ...((school?.settings || {}) as Record<string, unknown>) }
  const existing = (settings.attendance as AttendanceRecord[] | undefined) ?? []
  const others = existing.filter((a) => !(a.classId === classId && a.date === date))
  const next: AttendanceRecord[] = [
    ...others,
    ...rows.map((r) => ({
      id: `att_${classId}_${r.studentId}_${date}`,
      schoolId,
      classId,
      studentId: r.studentId,
      date,
      status: r.status,
      note: r.note,
      markedBy,
    })),
  ]
  settings.attendance = next.slice(-5000)
  await admin.from('schools').update({ settings }).eq('id', schoolId)
  return { usedTable: false }
}

export async function loadAttendanceForStudent(
  studentId: string,
  limit = 30
): Promise<AttendanceRecord[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('attendance')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(limit)

  if (!error && data) {
    return data.map((r) => mapRow(r as Record<string, unknown>))
  }

  // JSON fallback across school
  const { data: student } = await admin
    .from('students')
    .select('school_id')
    .eq('id', studentId)
    .maybeSingle()
  if (!student?.school_id) return []
  const { data: school } = await admin
    .from('schools')
    .select('settings')
    .eq('id', student.school_id)
    .maybeSingle()
  const settings = (school?.settings || {}) as { attendance?: AttendanceRecord[] }
  return (settings.attendance ?? [])
    .filter((a) => a.studentId === studentId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}

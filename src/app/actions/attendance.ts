'use server'

import { revalidatePath } from 'next/cache'
import { requireClassManager } from '@/lib/class-access'
import {
  loadAttendanceForClassDate,
  upsertAttendanceBatch,
} from '@/lib/attendance/store'
import type { AttendanceStatus } from '@/lib/attendance/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { queueAndSendEmail } from '@/lib/email/send'
import { ATTENDANCE_LABEL } from '@/lib/attendance/types'

export async function getAttendance(classId: string, date: string) {
  const access = await requireClassManager(classId)
  if (!access.ok) return { ok: false as const, error: access.error, records: [] }
  const records = await loadAttendanceForClassDate(classId, date)
  return { ok: true as const, records }
}

export async function saveAttendance(
  classId: string,
  date: string,
  rows: { studentId: string; status: AttendanceStatus; note?: string }[],
  options?: { notifyParents?: boolean }
): Promise<{ ok: true; notifyNote?: string } | { ok: false; error: string }> {
  const access = await requireClassManager(classId)
  if (!access.ok) return access

  if (!date) return { ok: false, error: 'Date is required.' }
  if (!rows.length) return { ok: false, error: 'No attendance rows.' }

  await upsertAttendanceBatch(
    access.classRow.school_id,
    classId,
    date,
    rows,
    access.user.id
  )

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: access.classRow.school_id,
    user_id: access.user.id,
    action: 'attendance.saved',
    table_name: 'attendance',
    details: { classId, date, count: rows.length, notify: Boolean(options?.notifyParents) },
  })

  let notifyNote: string | undefined
  if (options?.notifyParents) {
    const absentees = rows.filter((r) => r.status === 'absent' || r.status === 'tardy')
    let sent = 0
    for (const row of absentees) {
      const { data: links } = await admin
        .from('parent_students')
        .select('parent_id')
        .eq('student_id', row.studentId)
      const parentIds = (links ?? []).map((l) => l.parent_id)
      if (!parentIds.length) continue

      const { data: parents } = await admin
        .from('profiles')
        .select('email, full_name')
        .in('id', parentIds)

      const { data: student } = await admin
        .from('students')
        .select('first_name, last_name')
        .eq('id', row.studentId)
        .maybeSingle()

      const studentName = student
        ? `${student.first_name} ${student.last_name}`
        : 'your student'

      for (const p of parents ?? []) {
        if (!p.email) continue
        const result = await queueAndSendEmail({
          school_id: access.classRow.school_id,
          kind: 'system',
          to_email: p.email,
          to_name: p.full_name,
          subject: `[Beacon] Attendance notice · ${studentName}`,
          body_text: [
            `Hello ${p.full_name || 'Parent'},`,
            '',
            `Attendance update for ${studentName} in ${access.classRow.name}:`,
            `${ATTENDANCE_LABEL[row.status]} on ${date}`,
            row.note ? `Note: ${row.note}` : '',
            '',
            '— Beacon school suite',
          ]
            .filter(Boolean)
            .join('\n'),
          related_table: 'attendance',
          related_id: null,
          meta: { studentId: row.studentId, status: row.status, date },
        })
        if (result.status === 'sent' || result.status === 'skipped') sent++
      }
    }
    notifyNote =
      sent > 0
        ? `Notified parents on ${sent} message(s) for absent/tardy.`
        : 'No parent emails sent (no matches or all present).'
  }

  revalidatePath(`/classes/${classId}`)
  revalidatePath('/dashboard')
  revalidatePath('/admin/emails')
  return { ok: true, notifyNote }
}

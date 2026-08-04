'use server'

import { revalidatePath } from 'next/cache'
import { requireClassManager } from '@/lib/class-access'
import {
  loadAttendanceForClassDate,
  upsertAttendanceBatch,
} from '@/lib/attendance/store'
import type { AttendanceStatus } from '@/lib/attendance/types'
import { createAdminClient } from '@/lib/supabase/admin'
import { queueAndSendBatch } from '@/lib/email/send'
import {
  appBaseUrl,
  attendanceNoticeBodies,
  subjectTag,
} from '@/lib/email/templates'
import { resolveParentsForStudents } from '@/lib/email/recipients'
import { loadSchoolBrand } from '@/lib/school-brand'
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

  // Only accept students enrolled in this class (and at this school)
  const adminGate = createAdminClient()
  const { data: enrollRows } = await adminGate
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)
  const enrolled = new Set((enrollRows ?? []).map((e) => e.student_id as string))
  const filtered = rows.filter((r) => enrolled.has(r.studentId))
  if (!filtered.length) {
    return { ok: false, error: 'No valid roster students in attendance rows.' }
  }

  await upsertAttendanceBatch(
    access.classRow.school_id,
    classId,
    date,
    filtered,
    access.user.id
  )

  const admin = createAdminClient()
  await admin.from('audit_logs').insert({
    school_id: access.classRow.school_id,
    user_id: access.user.id,
    action: 'attendance.saved',
    table_name: 'attendance',
    details: {
      classId,
      date,
      count: filtered.length,
      notify: Boolean(options?.notifyParents),
    },
  })

  let notifyNote: string | undefined
  if (options?.notifyParents) {
    const absentees = filtered.filter((r) => r.status === 'absent' || r.status === 'tardy')
    if (!absentees.length) {
      notifyNote = 'No absent/tardy students — nothing to email.'
    } else {
      const brand = await loadSchoolBrand(access.classRow.school_id)
      const tag = subjectTag(brand)
      const base = appBaseUrl()
      const studentIds = absentees.map((r) => r.studentId)
      const parentsMap = await resolveParentsForStudents(studentIds)

      const { data: students } = await admin
        .from('students')
        .select('id, first_name, last_name')
        .in('id', studentIds)
      const studentById = new Map((students ?? []).map((s) => [s.id, s]))

      type Out = Parameters<typeof queueAndSendBatch>[0][number]
      const batch: Out[] = []

      for (const row of absentees) {
        const student = studentById.get(row.studentId)
        const studentName = student
          ? `${student.first_name} ${student.last_name}`
          : 'your student'
        for (const p of parentsMap.get(row.studentId) || []) {
          const { text, html } = attendanceNoticeBodies({
            brand,
            parentName: p.name || 'Parent',
            studentName,
            className: access.classRow.name,
            date,
            statusLabel: ATTENDANCE_LABEL[row.status],
            note: row.note,
            appUrl: `${base}/students/${row.studentId}`,
          })
          batch.push({
            school_id: access.classRow.school_id,
            kind: 'attendance_notice',
            to_email: p.email,
            to_name: p.name,
            subject: `[${tag}] Attendance · ${studentName}`,
            body_text: text,
            body_html: html,
            related_table: 'attendance',
            related_id: null,
            meta: { studentId: row.studentId, status: row.status, date },
          })
        }
      }

      if (!batch.length) {
        notifyNote = 'No parent emails for absent/tardy students.'
      } else {
        const result = await queueAndSendBatch(batch, { brand })
        notifyNote =
          result.sent + result.skipped > 0
            ? `Notified parents on ${result.sent + result.skipped} message(s) for absent/tardy.${result.note ? ` ${result.note}` : ''}`
            : 'No parent emails sent (delivery failed or no matches).'
      }
    }
  }

  revalidatePath(`/classes/${classId}`)
  revalidatePath('/dashboard')
  revalidatePath('/admin/emails')
  return { ok: true, notifyNote }
}

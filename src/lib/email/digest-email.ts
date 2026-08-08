import { createAdminClient } from '@/lib/supabase/admin'
import { queueAndSendBatch } from '@/lib/email/send'
import {
  appBaseUrl,
  dinnerDigestBodies,
  subjectTag,
} from '@/lib/email/templates'
import { resolveParentsForStudents } from '@/lib/email/recipients'
import { buildStudentDinnerAndConference } from '@/lib/insights/load-student-insights'
import { loadSchoolBrand } from '@/lib/school-brand'
import { isEmailHonestLive } from '@/lib/email/transport'

/**
 * Email Dinner Table Digest to all linked parents for a student.
 */
export async function emailDinnerDigestForStudent(opts: {
  studentId: string
  schoolId: string
  actorUserId?: string
}): Promise<{ sent: number; failed: number; skipped: number; note?: string }> {
  try {
    const admin = createAdminClient()
    const { data: student } = await admin
      .from('students')
      .select('id, school_id, first_name, last_name, grade_level')
      .eq('id', opts.studentId)
      .maybeSingle()

    if (!student) {
      return { sent: 0, failed: 0, skipped: 0, note: 'Student not found.' }
    }

    const schoolId = student.school_id || opts.schoolId
    const brand = await loadSchoolBrand(schoolId)
    const { dinner } = await buildStudentDinnerAndConference({
      id: student.id,
      school_id: schoolId,
      first_name: student.first_name,
      last_name: student.last_name,
      grade_level: student.grade_level,
    })

    const parentsMap = await resolveParentsForStudents([student.id], schoolId)
    const parents = parentsMap.get(student.id) || []
    if (!parents.length) {
      return {
        sent: 0,
        failed: 0,
        skipped: 0,
        note:
          'No parent emails linked to this student. Link parents on Roster (or set their profile email).',
      }
    }

    const base = appBaseUrl()
    const tag = subjectTag(brand)
    const emails = parents.map((p) => {
      const { text, html } = dinnerDigestBodies({
        brand,
        parentName: p.name || 'Parent',
        digest: dinner,
        appUrl: `${base}/students/${student.id}`,
      })
      return {
        school_id: schoolId,
        kind: 'dinner_digest' as const,
        to_email: p.email,
        to_name: p.name,
        subject: `[${tag}] Dinner Table Digest · ${dinner.studentName}`,
        body_text: text,
        body_html: html,
        related_table: 'students',
        related_id: student.id,
        meta: {
          student_id: student.id,
          parent_id: p.parentId,
          week_label: dinner.weekLabel,
        },
      }
    })

    const result = await queueAndSendBatch(emails, { brand })

    // Audit must never fail the send path
    const { error: auditError } = await admin.from('audit_logs').insert({
      school_id: schoolId,
      user_id: opts.actorUserId ?? null,
      action: 'email.dinner_digest',
      table_name: 'students',
      record_id: student.id,
      details: {
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped,
        parents: parents.length,
      },
    })
    if (auditError) {
      console.warn('[dinner-digest] audit_logs insert failed', auditError.message)
    }

    if (result.sent > 0) {
      return {
        ...result,
        note:
          result.note ||
          `Dinner Table Digest emailed to ${result.sent} parent(s).`,
      }
    }

    if (result.skipped > 0) {
      const liveHint = isEmailHonestLive()
        ? result.note
        : 'Logged to Email outbox only — set RESEND_API_KEY and a verified EMAIL_FROM (not onboarding@resend.dev) for live delivery.'
      return {
        ...result,
        note: liveHint || result.note,
      }
    }

    return {
      ...result,
      note: result.note || 'No digest emails delivered.',
    }
  } catch (e) {
    console.error('[dinner-digest] send failed', e)
    return {
      sent: 0,
      failed: 0,
      skipped: 0,
      note: e instanceof Error ? e.message : 'Dinner digest email failed.',
    }
  }
}

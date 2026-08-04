/**
 * Parent alerts when a student checks in/out of aftercare.
 * Email always attempted (cascade). SMS optional via Twilio.
 * Never throws — scan success must not depend on notify.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { queueAndSendBatch } from '@/lib/email/send'
import {
  aftercareNoticeBodies,
  appBaseUrl,
  subjectTag,
} from '@/lib/email/templates'
import { loadSchoolBrand } from '@/lib/school-brand'
import { isSmsConfigured, normalizePhone, sendSms } from '@/lib/sms/twilio'
import type { ScanDirection } from './types'

export type AftercareNotifyResult = {
  emailsSent: number
  smsSent: number
  note?: string
}

async function parentsForStudent(
  studentId: string,
  schoolId?: string
): Promise<
  { parentId: string; email: string | null; phone: string | null; name: string | null }[]
> {
  const admin = createAdminClient()
  const { data: links } = await admin
    .from('parent_students')
    .select('parent_id')
    .eq('student_id', studentId)
  if (!links?.length) return []

  const ids = [...new Set(links.map((l) => l.parent_id))]
  let q = admin.from('profiles').select('id, email, full_name, phone, school_id').in('id', ids)
  if (schoolId) q = q.eq('school_id', schoolId)
  const { data: parents } = await q

  return (parents ?? []).map((p) => ({
    parentId: p.id as string,
    email: (p.email as string | null)?.trim().toLowerCase() || null,
    phone: (p.phone as string | null) || null,
    name: (p.full_name as string | null) || null,
  }))
}

export async function schoolWantsAftercareNotify(schoolId: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('schools')
      .select('settings')
      .eq('id', schoolId)
      .maybeSingle()
    const settings = (data?.settings || {}) as {
      badge?: { notifyParentsOnAftercare?: boolean }
    }
    // default ON
    if (settings.badge?.notifyParentsOnAftercare === false) return false
    return true
  } catch {
    return true
  }
}

export async function notifyParentsOfAftercareScan(opts: {
  schoolId: string
  studentId: string
  studentName: string
  roomName: string
  direction: ScanDirection
  minutes?: number | null
  amountCents?: number | null
  sessionId?: string | null
}): Promise<AftercareNotifyResult> {
  try {
    const wants = await schoolWantsAftercareNotify(opts.schoolId)
    if (!wants) return { emailsSent: 0, smsSent: 0, note: 'Parent aftercare notify disabled.' }

    const parents = await parentsForStudent(opts.studentId, opts.schoolId)
    if (!parents.length) {
      return { emailsSent: 0, smsSent: 0, note: 'No linked parents for student.' }
    }

    const brand = await loadSchoolBrand(opts.schoolId)
    const tag = subjectTag(brand)
    const base = appBaseUrl()
    const time = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    const dirWord = opts.direction === 'in' ? 'checked IN to' : 'checked OUT of'
    const amountLine =
      opts.direction === 'out' && opts.amountCents != null && opts.amountCents > 0
        ? ` · ${opts.minutes ?? 0} min · $${(opts.amountCents / 100).toFixed(2)}`
        : opts.direction === 'out' && opts.minutes != null
          ? ` · ${opts.minutes} min`
          : ''

    const smsBody = `${brand.shortName || brand.name}: ${opts.studentName} ${dirWord} ${opts.roomName} at ${time}${amountLine}.`

    type Out = Parameters<typeof queueAndSendBatch>[0][number]
    const batch: Out[] = []
    let smsSent = 0
    const smsErrors: string[] = []

    for (const parent of parents) {
      if (parent.email && parent.email.includes('@')) {
        const { text, html } = aftercareNoticeBodies({
          brand,
          parentName: parent.name || 'Parent',
          studentName: opts.studentName,
          roomName: opts.roomName,
          direction: opts.direction,
          timeLabel: time,
          minutes: opts.minutes,
          amountCents: opts.amountCents,
          appUrl: `${base}/dashboard`,
        })
        batch.push({
          school_id: opts.schoolId,
          kind: 'aftercare_notice',
          to_email: parent.email,
          to_name: parent.name,
          subject: `[${tag}] Aftercare ${opts.direction.toUpperCase()}: ${opts.studentName}`,
          body_text: text,
          body_html: html,
          related_table: 'aftercare_sessions',
          related_id: opts.sessionId || opts.studentId,
          meta: {
            student_id: opts.studentId,
            direction: opts.direction,
            room: opts.roomName,
          },
        })
      }

      const phone = normalizePhone(parent.phone)
      if (phone && isSmsConfigured()) {
        const r = await sendSms({ to: phone, body: smsBody })
        if (r.ok) smsSent++
        else if (!r.skipped && r.error) smsErrors.push(r.error)
      }
    }

    const notes: string[] = []
    let emailsSent = 0
    if (batch.length) {
      const r = await queueAndSendBatch(batch, { brand })
      // Only count actually delivered — not log-only / skipped
      emailsSent = r.sent
      if (r.sent === 0 && r.skipped > 0) {
        notes.push('Email not live (log-only); parents not emailed.')
      }
    } else {
      notes.push('No parent emails.')
    }
    if (!isSmsConfigured()) notes.push('SMS not configured (optional TWILIO_*).')
    else if (smsSent === 0 && parents.some((p) => normalizePhone(p.phone))) {
      notes.push(smsErrors[0] || 'SMS not delivered.')
    } else if (smsSent === 0) {
      notes.push('No parent phone numbers on profiles.')
    }

    return {
      emailsSent,
      smsSent,
      note: notes.length ? notes.join(' ') : undefined,
    }
  } catch (e) {
    const { reportError } = await import('@/lib/ops/report-error')
    reportError(e, { surface: 'aftercare-notify' })
    return {
      emailsSent: 0,
      smsSent: 0,
      note: e instanceof Error ? e.message : 'Notify failed',
    }
  }
}

import { createAdminClient } from '@/lib/supabase/admin'
import { upsertAttendanceBatch } from '@/lib/attendance/store'
import { addInvoice, loadBillingState, upsertProduct } from '@/lib/billing/store'
import type { BillingInvoice, BillingProduct } from '@/lib/billing/types'
import {
  computeAftercareAmountCents,
  generateBadgeCode,
  parseScannerInput,
} from './codes'
import type {
  AftercareSession,
  BadgeScan,
  RoomKind,
  ScanDirection,
  ScanPurpose,
  ScanResult,
  SchoolRoom,
  StudentBadge,
} from './types'

function mapRoom(r: Record<string, unknown>): SchoolRoom {
  return {
    id: String(r.id),
    schoolId: String(r.school_id),
    name: String(r.name),
    kind: (r.kind as RoomKind) || 'classroom',
    classId: (r.class_id as string) || null,
    billable: Boolean(r.billable),
    rateCentsPerHour: Number(r.rate_cents_per_hour) || 0,
    active: r.active !== false,
    sortOrder: Number(r.sort_order) || 0,
  }
}

function mapScan(r: Record<string, unknown>): BadgeScan {
  return {
    id: String(r.id),
    schoolId: String(r.school_id),
    studentId: String(r.student_id),
    roomId: (r.room_id as string) || null,
    direction: r.direction as ScanDirection,
    purpose: (r.purpose as ScanPurpose) || 'general',
    scannedAt: String(r.scanned_at),
    source: String(r.source || 'kiosk'),
    kioskLabel: (r.kiosk_label as string) || null,
    sessionId: (r.session_id as string) || null,
  }
}

function mapSession(r: Record<string, unknown>): AftercareSession {
  return {
    id: String(r.id),
    schoolId: String(r.school_id),
    studentId: String(r.student_id),
    roomId: (r.room_id as string) || null,
    checkInAt: String(r.check_in_at),
    checkOutAt: (r.check_out_at as string) || null,
    minutes: r.minutes == null ? null : Number(r.minutes),
    rateCentsPerHour: Number(r.rate_cents_per_hour) || 0,
    amountCents: r.amount_cents == null ? null : Number(r.amount_cents),
    status: (r.status as AftercareSession['status']) || 'open',
    invoiceId: (r.invoice_id as string) || null,
  }
}

export async function ensureStudentBadgeCodes(schoolId: string): Promise<number> {
  const admin = createAdminClient()
  const { data: students, error } = await admin
    .from('students')
    .select('id, badge_code')
    .eq('school_id', schoolId)
    .eq('active', true)

  if (error) return 0

  let assigned = 0
  const used = new Set(
    (students ?? [])
      .map((s) => (s.badge_code as string | null)?.toUpperCase())
      .filter(Boolean) as string[]
  )

  for (const s of students ?? []) {
    if (s.badge_code) continue
    let code = generateBadgeCode(6)
    let tries = 0
    while (used.has(code) && tries < 20) {
      code = generateBadgeCode(6)
      tries++
    }
    used.add(code)
    const { error: uerr } = await admin
      .from('students')
      .update({ badge_code: code })
      .eq('id', s.id)
      .eq('school_id', schoolId)
    if (!uerr) assigned++
  }
  return assigned
}

export async function listStudentBadges(
  schoolId: string,
  schoolName: string
): Promise<StudentBadge[]> {
  await ensureStudentBadgeCodes(schoolId)
  const admin = createAdminClient()
  const { data } = await admin
    .from('students')
    .select('id, first_name, last_name, grade_level, badge_code')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('last_name')
    .order('first_name')

  return (data ?? [])
    .filter((s) => s.badge_code)
    .map((s) => ({
      id: s.id as string,
      firstName: s.first_name as string,
      lastName: s.last_name as string,
      gradeLevel: (s.grade_level as string) || null,
      badgeCode: String(s.badge_code).toUpperCase(),
      schoolName,
    }))
}

export async function listRooms(schoolId: string): Promise<SchoolRoom[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('school_rooms')
    .select('*')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('sort_order')
    .order('name')

  if (error) return []
  return (data ?? []).map((r) => mapRoom(r as Record<string, unknown>))
}

export async function upsertRoom(
  schoolId: string,
  input: {
    id?: string
    name: string
    kind: RoomKind
    classId?: string | null
    billable?: boolean
    rateCentsPerHour?: number
  }
): Promise<{ ok: true; room: SchoolRoom } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const name = input.name.trim()
  if (!name) return { ok: false, error: 'Room name is required.' }

  const row = {
    school_id: schoolId,
    name,
    kind: input.kind,
    class_id: input.classId || null,
    billable: Boolean(input.billable ?? input.kind === 'aftercare'),
    rate_cents_per_hour: Math.max(0, Math.floor(input.rateCentsPerHour ?? 0)),
    active: true,
  }

  if (input.id) {
    const { data, error } = await admin
      .from('school_rooms')
      .update(row)
      .eq('id', input.id)
      .eq('school_id', schoolId)
      .select('*')
      .single()
    if (error || !data) return { ok: false, error: error?.message || 'Update failed' }
    return { ok: true, room: mapRoom(data as Record<string, unknown>) }
  }

  const { data, error } = await admin
    .from('school_rooms')
    .insert(row)
    .select('*')
    .single()
  if (error || !data) return { ok: false, error: error?.message || 'Create failed' }
  return { ok: true, room: mapRoom(data as Record<string, unknown>) }
}

export async function ensureDefaultRooms(schoolId: string): Promise<void> {
  const rooms = await listRooms(schoolId)
  if (rooms.length > 0) return
  await upsertRoom(schoolId, {
    name: 'Main classroom',
    kind: 'classroom',
    billable: false,
  })
  await upsertRoom(schoolId, {
    name: 'After school care',
    kind: 'aftercare',
    billable: true,
    rateCentsPerHour: 800, // $8/hr default — office can change
  })
}

export async function getOrCreateKioskToken(schoolId: string): Promise<string> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()
  const settings = { ...((data?.settings || {}) as Record<string, unknown>) }
  const badge = {
    ...((settings.badge as Record<string, unknown>) || {}),
  }
  if (typeof badge.kioskToken === 'string' && badge.kioskToken.length >= 16) {
    return badge.kioskToken
  }
  const token = generateBadgeCode(10) + generateBadgeCode(10)
  badge.kioskToken = token
  settings.badge = badge
  await admin.from('schools').update({ settings }).eq('id', schoolId)
  return token
}

export async function resolveSchoolByKioskToken(
  token: string
): Promise<{ schoolId: string; schoolName: string } | null> {
  if (!token || token.length < 12) return null
  const admin = createAdminClient()
  const { data: schools } = await admin.from('schools').select('id, name, settings')
  for (const s of schools ?? []) {
    const settings = (s.settings || {}) as { badge?: { kioskToken?: string } }
    if (settings.badge?.kioskToken === token) {
      return { schoolId: s.id as string, schoolName: (s.name as string) || 'School' }
    }
  }
  return null
}

export async function listRecentScans(
  schoolId: string,
  limit = 40
): Promise<(BadgeScan & { studentName?: string; roomName?: string })[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('badge_scans')
    .select('*')
    .eq('school_id', schoolId)
    .order('scanned_at', { ascending: false })
    .limit(limit)
  if (error || !data?.length) return []

  const scans = data.map((r) => mapScan(r as Record<string, unknown>))
  const studentIds = [...new Set(scans.map((s) => s.studentId))]
  const roomIds = [...new Set(scans.map((s) => s.roomId).filter(Boolean))] as string[]

  const [{ data: students }, { data: rooms }] = await Promise.all([
    admin.from('students').select('id, first_name, last_name').in('id', studentIds),
    roomIds.length
      ? admin.from('school_rooms').select('id, name').in('id', roomIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])

  const sn = new Map(
    (students ?? []).map((s) => [
      s.id as string,
      `${s.first_name} ${s.last_name}`,
    ])
  )
  const rn = new Map((rooms ?? []).map((r) => [r.id as string, r.name as string]))

  return scans.map((s) => ({
    ...s,
    studentName: sn.get(s.studentId),
    roomName: s.roomId ? rn.get(s.roomId) : undefined,
  }))
}

export async function listOpenAftercare(
  schoolId: string
): Promise<(AftercareSession & { studentName?: string; roomName?: string })[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('aftercare_sessions')
    .select('*')
    .eq('school_id', schoolId)
    .eq('status', 'open')
    .order('check_in_at', { ascending: false })
  if (error || !data?.length) return []

  const sessions = data.map((r) => mapSession(r as Record<string, unknown>))
  const studentIds = [...new Set(sessions.map((s) => s.studentId))]
  const roomIds = [...new Set(sessions.map((s) => s.roomId).filter(Boolean))] as string[]
  const [{ data: students }, { data: rooms }] = await Promise.all([
    admin.from('students').select('id, first_name, last_name').in('id', studentIds),
    roomIds.length
      ? admin.from('school_rooms').select('id, name').in('id', roomIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ])
  const sn = new Map(
    (students ?? []).map((s) => [s.id as string, `${s.first_name} ${s.last_name}`])
  )
  const rn = new Map((rooms ?? []).map((r) => [r.id as string, r.name as string]))
  return sessions.map((s) => ({
    ...s,
    studentName: sn.get(s.studentId),
    roomName: s.roomId ? rn.get(s.roomId) : undefined,
  }))
}

/**
 * Core kiosk action: scan badge in or out of a room.
 */
export async function processBadgeScan(input: {
  schoolId: string
  rawCode: string
  roomId: string
  direction: ScanDirection
  kioskLabel?: string
  source?: string
}): Promise<ScanResult> {
  const admin = createAdminClient()
  const code = parseScannerInput(input.rawCode)
  if (!code || code.length < 4) {
    return { ok: false, error: 'Scan a valid badge code.' }
  }

  const { data: student } = await admin
    .from('students')
    .select('id, first_name, last_name, school_id, active')
    .eq('school_id', input.schoolId)
    .eq('badge_code', code)
    .maybeSingle()

  if (!student || student.active === false) {
    return { ok: false, error: `No student found for code ${code}.` }
  }

  const { data: roomRow } = await admin
    .from('school_rooms')
    .select('*')
    .eq('id', input.roomId)
    .eq('school_id', input.schoolId)
    .maybeSingle()

  if (!roomRow) {
    return { ok: false, error: 'Room not found. Set up rooms in Principal → Badges.' }
  }

  const room = mapRoom(roomRow as Record<string, unknown>)
  const purpose: ScanPurpose =
    room.kind === 'aftercare' ? 'aftercare' : room.kind === 'classroom' ? 'attendance' : 'general'

  const studentName = `${student.first_name} ${student.last_name}`
  let sessionId: string | null = null
  let aftercareMinutes: number | null = null
  let amountCents: number | null = null
  let attendanceMarked = false
  let message = ''

  if (purpose === 'aftercare') {
    if (input.direction === 'in') {
      // Close any weird double-open? Keep one open.
      const { data: open } = await admin
        .from('aftercare_sessions')
        .select('id')
        .eq('school_id', input.schoolId)
        .eq('student_id', student.id)
        .eq('status', 'open')
        .maybeSingle()

      if (open) {
        sessionId = open.id as string
        message = `${studentName} already checked into aftercare.`
      } else {
        const { data: sess, error } = await admin
          .from('aftercare_sessions')
          .insert({
            school_id: input.schoolId,
            student_id: student.id,
            room_id: room.id,
            check_in_at: new Date().toISOString(),
            rate_cents_per_hour: room.rateCentsPerHour,
            status: 'open',
          })
          .select('id')
          .single()
        if (error || !sess) {
          return { ok: false, error: error?.message || 'Could not start aftercare session.' }
        }
        sessionId = sess.id as string
        message = `${studentName} checked IN to ${room.name} (aftercare tracking started).`
      }
    } else {
      const { data: open } = await admin
        .from('aftercare_sessions')
        .select('*')
        .eq('school_id', input.schoolId)
        .eq('student_id', student.id)
        .eq('status', 'open')
        .order('check_in_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!open) {
        message = `${studentName} checked OUT of ${room.name} (no open aftercare session).`
      } else {
        const checkIn = new Date(open.check_in_at as string)
        const checkOut = new Date()
        const minutes = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000))
        const rate = Number(open.rate_cents_per_hour) || room.rateCentsPerHour
        const amount = room.billable ? computeAftercareAmountCents(minutes, rate) : 0
        aftercareMinutes = minutes
        amountCents = amount
        sessionId = open.id as string

        await admin
          .from('aftercare_sessions')
          .update({
            check_out_at: checkOut.toISOString(),
            minutes,
            amount_cents: amount,
            status: 'closed',
          })
          .eq('id', open.id)

        message = `${studentName} checked OUT of ${room.name} · ${minutes} min` +
          (amount > 0 ? ` · $${(amount / 100).toFixed(2)} billable` : '')
      }
    }
  } else {
    // Classroom / general
    if (input.direction === 'in' && (room.classId || purpose === 'attendance')) {
      attendanceMarked = await markPresentForStudent(
        input.schoolId,
        student.id as string,
        room.classId
      )
    }
    message =
      `${studentName} checked ${input.direction.toUpperCase()} · ${room.name}` +
      (attendanceMarked ? ' · attendance marked present' : '')
  }

  const { error: scanErr } = await admin.from('badge_scans').insert({
    school_id: input.schoolId,
    student_id: student.id,
    room_id: room.id,
    direction: input.direction,
    purpose,
    source: input.source || 'kiosk',
    kiosk_label: input.kioskLabel || null,
    session_id: sessionId,
    meta: { code },
  })

  if (scanErr) {
    // Tables may be missing
    if (/does not exist|schema cache|relation/i.test(scanErr.message)) {
      return {
        ok: false,
        error:
          'Badge tables not installed. Run scripts/pending-011-badge-kiosk.sql in Supabase SQL Editor.',
      }
    }
    return { ok: false, error: scanErr.message }
  }

  return {
    ok: true,
    studentName,
    direction: input.direction,
    purpose,
    roomName: room.name,
    message,
    aftercareMinutes,
    amountCents,
    attendanceMarked,
  }
}

async function markPresentForStudent(
  schoolId: string,
  studentId: string,
  classId: string | null
): Promise<boolean> {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  let classIds: string[] = []
  if (classId) {
    classIds = [classId]
  } else {
    const { data: enroll } = await admin
      .from('enrollments')
      .select('class_id')
      .eq('student_id', studentId)
    classIds = (enroll ?? []).map((e) => e.class_id as string)
  }
  if (!classIds.length) return false

  let any = false
  for (const cid of classIds) {
    try {
      await upsertAttendanceBatch(
        schoolId,
        cid,
        today,
        [{ studentId, status: 'present', note: 'Badge scan-in' }],
        'badge-kiosk'
      )
      any = true
    } catch {
      // continue
    }
  }
  return any
}

/** Create draft invoices for closed aftercare sessions not yet billed. */
export async function billClosedAftercareSessions(
  schoolId: string
): Promise<{ billed: number; totalCents: number; errors: string[] }> {
  const admin = createAdminClient()
  const { data: sessions, error } = await admin
    .from('aftercare_sessions')
    .select('*')
    .eq('school_id', schoolId)
    .eq('status', 'closed')
    .gt('amount_cents', 0)
    .limit(100)

  if (error) {
    return {
      billed: 0,
      totalCents: 0,
      errors: [
        error.message.includes('does not exist')
          ? 'Run pending-011-badge-kiosk.sql first.'
          : error.message,
      ],
    }
  }

  // Ensure aftercare product exists
  const billing = await loadBillingState(schoolId)
  let product = billing.products.find((p) => p.id === 'prod_aftercare')
  if (!product) {
    product = {
      id: 'prod_aftercare',
      name: 'After school care',
      description: 'Hourly aftercare from badge check-in/out',
      amountCents: 800,
      currency: 'USD',
      frequency: 'one_time',
      active: true,
    } satisfies BillingProduct
    await upsertProduct(schoolId, product)
  }

  let billed = 0
  let totalCents = 0
  const errors: string[] = []

  for (const raw of sessions ?? []) {
    const sess = mapSession(raw as Record<string, unknown>)
    const { data: student } = await admin
      .from('students')
      .select('id, first_name, last_name')
      .eq('id', sess.studentId)
      .maybeSingle()
    if (!student) continue

    // Find a parent email for invoice
    const { data: links } = await admin
      .from('parent_students')
      .select('parent_id')
      .eq('student_id', sess.studentId)
      .limit(1)
    let parentEmail = 'office@school.local'
    let familyName = `${student.last_name} family`
    if (links?.[0]) {
      const { data: parent } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', links[0].parent_id)
        .maybeSingle()
      if (parent?.email) parentEmail = parent.email as string
      if (parent?.full_name) familyName = parent.full_name as string
    }

    const amount = sess.amountCents || 0
    const invoice: BillingInvoice = {
      id: `inv_ac_${sess.id}`,
      studentId: sess.studentId,
      familyName,
      parentEmail,
      productId: 'prod_aftercare',
      description: `Aftercare ${student.first_name} ${student.last_name} · ${sess.minutes ?? 0} min`,
      amountCents: amount,
      currency: 'USD',
      status: 'open',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }

    try {
      await addInvoice(schoolId, invoice)
      await admin
        .from('aftercare_sessions')
        .update({ status: 'billed', invoice_id: invoice.id })
        .eq('id', sess.id)
      billed++
      totalCents += amount
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'invoice failed')
    }
  }

  return { billed, totalCents, errors }
}

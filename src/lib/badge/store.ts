import { createAdminClient } from '@/lib/supabase/admin'
import { upsertAttendanceBatch } from '@/lib/attendance/store'
import { addInvoice, loadBillingState, upsertProduct } from '@/lib/billing/store'
import type { BillingInvoice, BillingProduct } from '@/lib/billing/types'
import {
  computeAftercareAmountCents,
  generateBadgeCode,
  generateDeviceToken,
  normalizeCode,
  parseScannerInput,
} from './codes'
import { notifyParentsOfAftercareScan } from './notify-parents'
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
  type StudentBadgeRow = {
    id: string
    first_name: string
    last_name: string
    grade_level: string | null
    badge_code: string | null
    rfid_uid?: string | null
  }

  const withRfid = await admin
    .from('students')
    .select('id, first_name, last_name, grade_level, badge_code, rfid_uid')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('last_name')
    .order('first_name')

  let rows: StudentBadgeRow[] = []
  if (withRfid.error && /rfid_uid|column/i.test(withRfid.error.message)) {
    const fallback = await admin
      .from('students')
      .select('id, first_name, last_name, grade_level, badge_code')
      .eq('school_id', schoolId)
      .eq('active', true)
      .order('last_name')
      .order('first_name')
    rows = (fallback.data ?? []) as StudentBadgeRow[]
  } else {
    rows = (withRfid.data ?? []) as StudentBadgeRow[]
  }

  return rows
    .filter((s) => s.badge_code)
    .map((s) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      gradeLevel: s.grade_level || null,
      badgeCode: String(s.badge_code).toUpperCase(),
      rfidUid: s.rfid_uid ? String(s.rfid_uid).toUpperCase() : null,
      schoolName,
    }))
}

/** Assign / clear RFID or NFC card UID for a student (same lookup path as badge_code). */
export async function setStudentRfidUid(
  schoolId: string,
  studentId: string,
  rfidUid: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const value = rfidUid ? normalizeCode(rfidUid) : null
  if (value && value.length < 4) {
    return { ok: false, error: 'RFID UID too short (min 4 characters).' }
  }
  if (value) {
    const { data: clash } = await admin
      .from('students')
      .select('id, first_name, last_name')
      .eq('school_id', schoolId)
      .eq('rfid_uid', value)
      .neq('id', studentId)
      .maybeSingle()
    if (clash) {
      return {
        ok: false,
        error: `UID already on ${clash.first_name} ${clash.last_name}.`,
      }
    }
  }
  const { error } = await admin
    .from('students')
    .update({ rfid_uid: value })
    .eq('id', studentId)
    .eq('school_id', schoolId)
  if (error) {
    if (/rfid_uid|column/i.test(error.message)) {
      return {
        ok: false,
        error: 'Run scripts/pending-012-rfid-notify.sql to add rfid_uid column.',
      }
    }
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

export async function getOrCreateDeviceToken(schoolId: string): Promise<string> {
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
  if (typeof badge.deviceToken === 'string' && badge.deviceToken.length >= 16) {
    return badge.deviceToken
  }
  const token = generateDeviceToken()
  badge.deviceToken = token
  settings.badge = badge
  await admin.from('schools').update({ settings }).eq('id', schoolId)
  return token
}

export async function rotateDeviceToken(schoolId: string): Promise<string> {
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
  const token = generateDeviceToken()
  badge.deviceToken = token
  settings.badge = badge
  await admin.from('schools').update({ settings }).eq('id', schoolId)
  return token
}

export async function resolveSchoolByDeviceToken(
  token: string
): Promise<{ schoolId: string; schoolName: string } | null> {
  if (!token || token.length < 12) return null
  const admin = createAdminClient()
  const { data: schools } = await admin.from('schools').select('id, name, settings')
  for (const s of schools ?? []) {
    const settings = (s.settings || {}) as { badge?: { deviceToken?: string } }
    if (settings.badge?.deviceToken === token) {
      return { schoolId: s.id as string, schoolName: (s.name as string) || 'School' }
    }
  }
  return null
}

export async function setAftercareNotifyPreference(
  schoolId: string,
  enabled: boolean
): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()
  const settings = { ...((data?.settings || {}) as Record<string, unknown>) }
  const badge = {
    ...((settings.badge as Record<string, unknown>) || {}),
    notifyParentsOnAftercare: enabled,
  }
  settings.badge = badge
  await admin.from('schools').update({ settings }).eq('id', schoolId)
}

export async function getAftercareNotifyPreference(schoolId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()
  const settings = (data?.settings || {}) as {
    badge?: { notifyParentsOnAftercare?: boolean }
  }
  return settings.badge?.notifyParentsOnAftercare !== false
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

/** Students whose last scan in this room is IN (still present). */
export async function listRoomPresence(
  schoolId: string,
  roomId: string
): Promise<{ studentId: string; studentName: string; since: string; direction: ScanDirection }[]> {
  const admin = createAdminClient()
  const { data: scans, error } = await admin
    .from('badge_scans')
    .select('student_id, direction, scanned_at')
    .eq('school_id', schoolId)
    .eq('room_id', roomId)
    .order('scanned_at', { ascending: false })
    .limit(400)

  if (error || !scans?.length) return []

  const lastByStudent = new Map<
    string,
    { direction: ScanDirection; scanned_at: string }
  >()
  for (const s of scans) {
    const sid = s.student_id as string
    if (lastByStudent.has(sid)) continue
    lastByStudent.set(sid, {
      direction: s.direction as ScanDirection,
      scanned_at: s.scanned_at as string,
    })
  }

  const presentIds = [...lastByStudent.entries()]
    .filter(([, v]) => v.direction === 'in')
    .map(([id]) => id)
  if (!presentIds.length) return []

  const { data: students } = await admin
    .from('students')
    .select('id, first_name, last_name')
    .in('id', presentIds)

  const names = new Map(
    (students ?? []).map((s) => [
      s.id as string,
      `${s.first_name} ${s.last_name}`,
    ])
  )

  return presentIds
    .map((id) => {
      const last = lastByStudent.get(id)!
      return {
        studentId: id,
        studentName: names.get(id) || 'Student',
        since: last.scanned_at,
        direction: last.direction,
      }
    })
    .sort((a, b) => a.studentName.localeCompare(b.studentName))
}

export async function searchKioskStudents(
  schoolId: string,
  query: string
): Promise<{ id: string; name: string; badgeCode: string | null; gradeLevel: string | null }[]> {
  const safe = query
    .trim()
    .replace(/[^a-zA-Z0-9 \-']/g, '')
    .slice(0, 40)
  if (safe.length < 1) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('students')
    .select('id, first_name, last_name, badge_code, grade_level')
    .eq('school_id', schoolId)
    .eq('active', true)
    .or(
      `first_name.ilike.%${safe}%,last_name.ilike.%${safe}%,badge_code.ilike.%${safe}%`
    )
    .order('last_name')
    .limit(20)

  return (data ?? []).map((s) => ({
    id: s.id as string,
    name: `${s.last_name}, ${s.first_name}`,
    badgeCode: (s.badge_code as string) || null,
    gradeLevel: (s.grade_level as string) || null,
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
 * Pass rawCode (badge) and/or studentId (name-tap fallback).
 */
export async function processBadgeScan(input: {
  schoolId: string
  rawCode?: string
  studentId?: string
  roomId: string
  direction: ScanDirection
  kioskLabel?: string
  source?: string
}): Promise<ScanResult> {
  const admin = createAdminClient()

  type StudentRow = {
    id: string
    first_name: string
    last_name: string
    school_id: string
    active: boolean | null
    badge_code: string | null
    rfid_uid: string | null
  }

  let student: StudentRow | null = null
  let resolvedCode = ''

  if (input.studentId) {
    const { data } = await admin
      .from('students')
      .select('id, first_name, last_name, school_id, active, badge_code, rfid_uid')
      .eq('id', input.studentId)
      .eq('school_id', input.schoolId)
      .maybeSingle()
    student = (data as StudentRow | null) ?? null
    resolvedCode = student?.badge_code || input.studentId.slice(0, 8)
  } else {
    const code = parseScannerInput(input.rawCode || '')
    resolvedCode = code
    if (!code || code.length < 4) {
      return { ok: false, error: 'Scan a valid badge or RFID code.' }
    }
    // Prefer badge_code, then rfid_uid (USB wedge / ESP32 readers)
    const { data: byBadge } = await admin
      .from('students')
      .select('id, first_name, last_name, school_id, active, badge_code, rfid_uid')
      .eq('school_id', input.schoolId)
      .eq('badge_code', code)
      .maybeSingle()
    student = (byBadge as StudentRow | null) ?? null
    if (!student) {
      const { data: byRfid, error: rfidErr } = await admin
        .from('students')
        .select('id, first_name, last_name, school_id, active, badge_code, rfid_uid')
        .eq('school_id', input.schoolId)
        .eq('rfid_uid', code)
        .maybeSingle()
      if (rfidErr && /rfid_uid|column/i.test(rfidErr.message)) {
        // Column not migrated yet — ignore RFID path
      } else {
        student = (byRfid as StudentRow | null) ?? null
      }
    }
    if (!student || student.active === false) {
      return { ok: false, error: `No student found for code ${code}.` }
    }
  }

  if (!student || student.active === false) {
    return { ok: false, error: 'Student not found or inactive.' }
  }

  // Debounce: ignore same student+room+direction within 20s
  const since = new Date(Date.now() - 20_000).toISOString()
  const { data: recentDup } = await admin
    .from('badge_scans')
    .select('id, scanned_at')
    .eq('school_id', input.schoolId)
    .eq('student_id', student.id)
    .eq('room_id', input.roomId)
    .eq('direction', input.direction)
    .gte('scanned_at', since)
    .limit(1)
    .maybeSingle()
  if (recentDup) {
    return {
      ok: false,
      error: 'Already scanned — wait a moment before scanning again.',
    }
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
    meta: { code: resolvedCode },
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

  let parentNotify: { emailsSent: number; smsSent: number; note?: string } | undefined
  if (purpose === 'aftercare') {
    parentNotify = await notifyParentsOfAftercareScan({
      schoolId: input.schoolId,
      studentId: student.id,
      studentName,
      roomName: room.name,
      direction: input.direction,
      minutes: aftercareMinutes,
      amountCents,
      sessionId,
    })
    if (parentNotify.emailsSent || parentNotify.smsSent) {
      const bits: string[] = []
      if (parentNotify.emailsSent) bits.push(`${parentNotify.emailsSent} email`)
      if (parentNotify.smsSent) bits.push(`${parentNotify.smsSent} SMS`)
      message = `${message} · parents notified (${bits.join(', ')})`
    }
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
    parentNotify,
  }
}

/**
 * Device / RFID hardware path: resolve school by device token, optional auto IN/OUT.
 */
export async function processDeviceScan(input: {
  deviceToken: string
  rawCode: string
  roomId: string
  direction?: ScanDirection | 'auto'
  deviceLabel?: string
}): Promise<ScanResult> {
  const school = await resolveSchoolByDeviceToken(input.deviceToken)
  if (!school) {
    return { ok: false, error: 'Invalid device token.' }
  }

  let direction: ScanDirection = input.direction === 'out' ? 'out' : 'in'
  if (!input.direction || input.direction === 'auto') {
    // Look up student first, then toggle on room presence
    const code = parseScannerInput(input.rawCode)
    if (!code || code.length < 4) {
      return { ok: false, error: 'Scan a valid badge or RFID code.' }
    }
    const admin = createAdminClient()
    let studentId: string | null = null
    const { data: byBadge } = await admin
      .from('students')
      .select('id')
      .eq('school_id', school.schoolId)
      .eq('badge_code', code)
      .maybeSingle()
    studentId = (byBadge?.id as string) || null
    if (!studentId) {
      const { data: byRfid } = await admin
        .from('students')
        .select('id')
        .eq('school_id', school.schoolId)
        .eq('rfid_uid', code)
        .maybeSingle()
      studentId = (byRfid?.id as string) || null
    }
    if (studentId) {
      const present = await listRoomPresence(school.schoolId, input.roomId)
      const isIn = present.some((p) => p.studentId === studentId)
      direction = isIn ? 'out' : 'in'
    }
  }

  return processBadgeScan({
    schoolId: school.schoolId,
    rawCode: input.rawCode,
    roomId: input.roomId,
    direction,
    kioskLabel: input.deviceLabel || 'RFID reader',
    source: 'rfid-device',
  })
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

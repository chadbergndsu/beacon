import { createAdminClient } from '@/lib/supabase/admin'
import { upsertAttendanceBatch } from '@/lib/attendance/store'
import {
  addInvoice,
  aftercareInvoiceSourceKey,
  ensureProductByCode,
} from '@/lib/billing/store'
import type { BillingInvoice } from '@/lib/billing/types'
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

/**
 * Tokens live in school_access_tokens (service-role only), not schools.settings,
 * so parents/teachers cannot read kiosk/device secrets via RLS.
 */
async function loadOrMigrateAccessTokens(schoolId: string): Promise<{
  kiosk_token: string
  device_token: string
}> {
  const admin = createAdminClient()
  const { data: row } = await admin
    .from('school_access_tokens')
    .select('kiosk_token, device_token')
    .eq('school_id', schoolId)
    .maybeSingle()

  if (row?.kiosk_token && row?.device_token) {
    return {
      kiosk_token: row.kiosk_token as string,
      device_token: row.device_token as string,
    }
  }

  // Migrate from legacy settings.badge if present
  const { data: school } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()
  const settings = { ...((school?.settings || {}) as Record<string, unknown>) }
  const badge = { ...((settings.badge as Record<string, unknown>) || {}) }
  const kiosk =
    typeof badge.kioskToken === 'string' && badge.kioskToken.length >= 16
      ? badge.kioskToken
      : generateBadgeCode(10) + generateBadgeCode(10)
  const device =
    typeof badge.deviceToken === 'string' && badge.deviceToken.length >= 16
      ? badge.deviceToken
      : generateDeviceToken()

  const { error } = await admin.from('school_access_tokens').upsert(
    {
      school_id: schoolId,
      kiosk_token: kiosk,
      device_token: device,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'school_id' }
  )

  if (error) {
    // Never write secrets into schools.settings (client-readable via RLS).
    // Require migration 015/016 school_access_tokens table.
    throw new Error(
      'school_access_tokens unavailable. Run pending-015 and pending-016 in Supabase SQL Editor.'
    )
  }

  // Strip any legacy secrets from settings so clients cannot read them
  if (badge.kioskToken || badge.deviceToken) {
    delete badge.kioskToken
    delete badge.deviceToken
    settings.badge = badge
    await admin.from('schools').update({ settings }).eq('id', schoolId)
  }

  return { kiosk_token: kiosk, device_token: device }
}

export async function getOrCreateDeviceToken(schoolId: string): Promise<string> {
  const t = await loadOrMigrateAccessTokens(schoolId)
  return t.device_token
}

export async function rotateDeviceToken(schoolId: string): Promise<string> {
  const admin = createAdminClient()
  const existing = await loadOrMigrateAccessTokens(schoolId)
  const token = generateDeviceToken()
  const { error } = await admin.from('school_access_tokens').upsert(
    {
      school_id: schoolId,
      kiosk_token: existing.kiosk_token,
      device_token: token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'school_id' }
  )
  if (error) {
    throw new Error(
      'Could not rotate device token. Ensure school_access_tokens exists (pending-015/016).'
    )
  }
  return token
}

export async function rotateKioskToken(schoolId: string): Promise<string> {
  const admin = createAdminClient()
  const existing = await loadOrMigrateAccessTokens(schoolId)
  const token = generateBadgeCode(10) + generateBadgeCode(10)
  const { error } = await admin.from('school_access_tokens').upsert(
    {
      school_id: schoolId,
      kiosk_token: token,
      device_token: existing.device_token,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'school_id' }
  )
  if (error) {
    throw new Error(
      'Could not rotate kiosk token. Ensure school_access_tokens exists (pending-015/016).'
    )
  }
  return token
}

export async function resolveSchoolByDeviceToken(
  token: string
): Promise<{ schoolId: string; schoolName: string } | null> {
  if (!token || token.length < 12) return null
  const admin = createAdminClient()
  const { data: row } = await admin
    .from('school_access_tokens')
    .select('school_id')
    .eq('device_token', token)
    .maybeSingle()
  if (row?.school_id) {
    const { data: school } = await admin
      .from('schools')
      .select('id, name')
      .eq('id', row.school_id)
      .maybeSingle()
    if (school) {
      return { schoolId: school.id as string, schoolName: (school.name as string) || 'School' }
    }
  }
  // No settings.badge fallback — secrets must live in school_access_tokens only
  return null
}

export async function setAftercareNotifyPreference(
  schoolId: string,
  enabled: boolean
): Promise<void> {
  const { mergeSchoolSettingsNested } = await import('@/lib/school-settings')
  const r = await mergeSchoolSettingsNested(schoolId, 'badge', {
    notifyParentsOnAftercare: enabled,
  })
  if (!r.ok) throw new Error(r.error)
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

  if (error) {
    console.error('listRooms', error.message)
    // Surface missing-table via empty + caller setup banner; other errors also []
    return []
  }
  return (data ?? []).map((r) => mapRoom(r as Record<string, unknown>))
}

export async function listRoomsResult(
  schoolId: string
): Promise<{ ok: true; rooms: SchoolRoom[] } | { ok: false; error: string }> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('school_rooms')
    .select('*')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('sort_order')
    .order('name')
  if (error) {
    const msg = error.message || 'Could not load rooms'
    if (/does not exist|schema cache|relation/i.test(msg)) {
      return {
        ok: false,
        error: 'Badge rooms table missing. Run pending-011-badge-kiosk.sql.',
      }
    }
    return { ok: false, error: msg }
  }
  return {
    ok: true,
    rooms: (data ?? []).map((r) => mapRoom(r as Record<string, unknown>)),
  }
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
  const t = await loadOrMigrateAccessTokens(schoolId)
  return t.kiosk_token
}

export async function resolveSchoolByKioskToken(
  token: string
): Promise<{ schoolId: string; schoolName: string } | null> {
  if (!token || token.length < 12) return null
  const admin = createAdminClient()
  const { data: row } = await admin
    .from('school_access_tokens')
    .select('school_id')
    .eq('kiosk_token', token)
    .maybeSingle()
  if (row?.school_id) {
    const { data: school } = await admin
      .from('schools')
      .select('id, name')
      .eq('id', row.school_id)
      .maybeSingle()
    if (school) {
      return { schoolId: school.id as string, schoolName: (school.name as string) || 'School' }
    }
  }
  // No settings.badge fallback — secrets must live in school_access_tokens only
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
  // Prefer open aftercare sessions for aftercare rooms (authoritative)
  const { data: room } = await admin
    .from('school_rooms')
    .select('kind')
    .eq('id', roomId)
    .maybeSingle()

  if (room?.kind === 'aftercare') {
    const { data: open } = await admin
      .from('aftercare_sessions')
      .select('student_id, check_in_at')
      .eq('school_id', schoolId)
      .eq('room_id', roomId)
      .eq('status', 'open')
    if (open?.length) {
      const ids = open.map((o) => o.student_id as string)
      const { data: students } = await admin
        .from('students')
        .select('id, first_name, last_name')
        .in('id', ids)
      const names = new Map(
        (students ?? []).map((s) => [s.id as string, `${s.first_name} ${s.last_name}`])
      )
      return open
        .map((o) => ({
          studentId: o.student_id as string,
          studentName: names.get(o.student_id as string) || 'Student',
          since: o.check_in_at as string,
          direction: 'in' as ScanDirection,
        }))
        .sort((a, b) => a.studentName.localeCompare(b.studentName))
    }
  }

  // Distinct latest scan per student via ordered fetch + first-seen (cap 2000)
  const { data: scans, error } = await admin
    .from('badge_scans')
    .select('student_id, direction, scanned_at')
    .eq('school_id', schoolId)
    .eq('room_id', roomId)
    .order('scanned_at', { ascending: false })
    .limit(2000)

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

/**
 * School-scoped student search for staff kiosk/desk.
 * Uses bound ilike filters (no PostgREST `.or()` string interpolation).
 */
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
  const pattern = `%${safe}%`
  const base = () =>
    admin
      .from('students')
      .select('id, first_name, last_name, badge_code, grade_level')
      .eq('school_id', schoolId)
      .eq('active', true)
      .limit(20)

  // Bound filters only — avoid PostgREST .or() string interpolation
  const [byFirst, byLast, byBadge] = await Promise.all([
    base().ilike('first_name', pattern),
    base().ilike('last_name', pattern),
    base().ilike('badge_code', pattern),
  ])

  type Row = {
    id: string
    first_name: string
    last_name: string
    badge_code: string | null
    grade_level: string | null
  }
  const byId = new Map<string, Row>()
  for (const row of [...(byFirst.data ?? []), ...(byLast.data ?? []), ...(byBadge.data ?? [])]) {
    const r = row as Row
    byId.set(r.id, r)
  }

  return [...byId.values()]
    .map((s) => ({
      id: s.id,
      name: `${s.last_name}, ${s.first_name}`,
      badgeCode: s.badge_code || null,
      gradeLevel: s.grade_level || null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 20)
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
      return { ok: false, error: 'No student found for that code.' }
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

  /** Only notify parents when aftercare session state actually changed */
  let aftercareStateChanged = false

  if (purpose === 'aftercare') {
    if (input.direction === 'in') {
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
        // no notify — not a new check-in
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
        if (error) {
          // Unique open session race — treat as already checked in
          if (/unique|duplicate|idx_aftercare_one_open/i.test(error.message)) {
            const { data: again } = await admin
              .from('aftercare_sessions')
              .select('id')
              .eq('school_id', input.schoolId)
              .eq('student_id', student.id)
              .eq('status', 'open')
              .maybeSingle()
            sessionId = (again?.id as string) || null
            message = `${studentName} already checked into aftercare.`
          } else {
            return { ok: false, error: error.message || 'Could not start aftercare session.' }
          }
        } else if (sess) {
          sessionId = sess.id as string
          message = `${studentName} checked IN to ${room.name} (aftercare tracking started).`
          aftercareStateChanged = true
        }
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
        // phantom OUT — do not notify parents
      } else {
        const checkIn = new Date(open.check_in_at as string)
        const checkOut = new Date()
        const minutes = Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 60000))
        const rate = Number(open.rate_cents_per_hour) || room.rateCentsPerHour
        const amount = room.billable ? computeAftercareAmountCents(minutes, rate) : 0
        aftercareMinutes = minutes
        amountCents = amount
        sessionId = open.id as string

        const { data: closed, error: closeErr } = await admin
          .from('aftercare_sessions')
          .update({
            check_out_at: checkOut.toISOString(),
            minutes,
            amount_cents: amount,
            status: 'closed',
          })
          .eq('id', open.id)
          .eq('status', 'open')
          .select('id')
          .maybeSingle()

        if (closeErr || !closed) {
          message = `${studentName} checked OUT of ${room.name} (session already closed).`
          aftercareMinutes = null
          amountCents = null
          // no notify — no new close
        } else {
          message =
            `${studentName} checked OUT of ${room.name} · ${minutes} min` +
            (amount > 0 ? ` · $${(amount / 100).toFixed(2)} billable` : '')
          aftercareStateChanged = true
        }
      }
    }
  } else {
    // Classroom: only mark attendance when room is linked to a class
    if (input.direction === 'in' && room.classId) {
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
  if (purpose === 'aftercare' && aftercareStateChanged) {
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
    } else if (parentNotify.note) {
      message = `${message} · ${parentNotify.note}`
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
  // Only mark the room-linked class — never all enrollments
  if (!classId) return false
  const admin = createAdminClient()
  const { data: enroll } = await admin
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)
    .eq('student_id', studentId)
    .maybeSingle()
  if (!enroll) return false
  const { schoolToday } = await import('@/lib/dates/school-day')
  const today = schoolToday()
  try {
    const result = await upsertAttendanceBatch(
      schoolId,
      classId,
      today,
      [{ studentId, status: 'present', note: 'Badge scan-in' }],
      null
    )
    return result.usedTable === true
  } catch (e) {
    console.error('badge attendance mark failed', e)
    return false
  }
}

/** Create draft invoices for closed aftercare sessions not yet billed. */
export async function billClosedAftercareSessions(
  schoolId: string
): Promise<{ billed: number; totalCents: number; errors: string[] }> {
  const admin = createAdminClient()
  // Claim closed, unbilled sessions only
  const { data: sessions, error } = await admin
    .from('aftercare_sessions')
    .select('*')
    .eq('school_id', schoolId)
    .eq('status', 'closed')
    .is('invoice_id', null)
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

  let product
  try {
    product = await ensureProductByCode(schoolId, 'aftercare', {
      name: 'After school care',
      description: 'Hourly aftercare from badge check-in/out',
      amountCents: 800,
      currency: 'USD',
      frequency: 'one_time',
      active: true,
    })
  } catch (e) {
    return {
      billed: 0,
      totalCents: 0,
      errors: [e instanceof Error ? e.message : 'Could not ensure aftercare product'],
    }
  }

  let billed = 0
  let totalCents = 0
  const errors: string[] = []

  for (const raw of sessions ?? []) {
    const sess = mapSession(raw as Record<string, unknown>)
    const sourceKey = aftercareInvoiceSourceKey(sess.id)
    const invoiceId = crypto.randomUUID()

    const { data: student } = await admin
      .from('students')
      .select('id, first_name, last_name')
      .eq('id', sess.studentId)
      .maybeSingle()
    if (!student) {
      errors.push(`Student missing for session ${sess.id}`)
      continue
    }

    const { data: links } = await admin
      .from('parent_students')
      .select('parent_id')
      .eq('student_id', sess.studentId)
      .limit(1)
    let parentEmail: string | null = null
    let familyName = `${student.last_name} family`
    if (links?.[0]) {
      const { data: parent } = await admin
        .from('profiles')
        .select('email, full_name, school_id')
        .eq('id', links[0].parent_id)
        .eq('school_id', schoolId)
        .maybeSingle()
      if (parent?.email) parentEmail = parent.email as string
      if (parent?.full_name) familyName = parent.full_name as string
    }
    if (!parentEmail?.includes('@')) {
      try {
        const { loadSchoolBrand } = await import('@/lib/school-brand')
        const brand = await loadSchoolBrand(schoolId)
        if (brand.email?.includes('@')) parentEmail = brand.email.trim()
      } catch {
        /* ignore */
      }
    }
    if (!parentEmail?.includes('@')) {
      errors.push(
        `No parent/office email for ${student.first_name} ${student.last_name} — left unbilled`
      )
      continue
    }

    const amount = sess.amountCents || 0
    const invoice: BillingInvoice = {
      id: invoiceId,
      studentId: sess.studentId,
      familyName,
      parentEmail,
      productId: product.id,
      sourceKey,
      description: `Aftercare ${student.first_name} ${student.last_name} · ${sess.minutes ?? 0} min`,
      amountCents: amount,
      currency: 'USD',
      status: 'open',
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    }

    // Durable invoice first (idempotent via source_key) — then CAS claim closed → billed
    try {
      await addInvoice(schoolId, invoice)
    } catch (e) {
      errors.push(e instanceof Error ? e.message : 'invoice failed')
      continue
    }

    // Resolve invoice id if a concurrent insert won the source_key race
    let claimInvoiceId = invoiceId
    const { data: invRow } = await admin
      .from('billing_invoices')
      .select('id')
      .eq('school_id', schoolId)
      .eq('source_key', sourceKey)
      .maybeSingle()
    if (invRow?.id) claimInvoiceId = String(invRow.id)

    const { data: claimed, error: claimErr } = await admin
      .from('aftercare_sessions')
      .update({ status: 'billed', invoice_id: claimInvoiceId })
      .eq('id', sess.id)
      .eq('status', 'closed')
      .is('invoice_id', null)
      .select('id')
      .maybeSingle()

    if (claimErr || !claimed) {
      // Concurrent worker or already claimed; invoice is idempotent by source_key
      continue
    }

    billed++
    totalCents += amount
  }

  return { billed, totalCents, errors }
}

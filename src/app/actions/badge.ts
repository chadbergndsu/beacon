'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveRole, isLeadership, isSchoolStaff } from '@/lib/roles'
import type { Role } from '@/lib/types'
import type { RoomKind, ScanDirection } from '@/lib/badge/types'
import {
  billClosedAftercareSessions,
  ensureDefaultRooms,
  ensureStudentBadgeCodes,
  getAftercareNotifyPreference,
  getOrCreateDeviceToken,
  getOrCreateKioskToken,
  listOpenAftercare,
  listRecentScans,
  listRoomPresence,
  listRooms,
  listStudentBadges,
  processBadgeScan,
  resolveSchoolByKioskToken,
  rotateDeviceToken,
  searchKioskStudents,
  setAftercareNotifyPreference,
  setStudentRfidUid,
  upsertRoom,
} from '@/lib/badge/store'
import { isSmsConfigured } from '@/lib/sms/twilio'
import { isEmailLive } from '@/lib/email/transport'

async function requireBadgeAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Not signed in.' }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role, email')
    .eq('id', user.id)
    .maybeSingle()
  const role = effectiveRole(
    profile
      ? { role: profile.role as Role, email: profile.email as string | null }
      : null
  )
  if (!profile?.school_id || !isLeadership(role)) {
    return { ok: false as const, error: 'Principal/admin only.' }
  }
  return { ok: true as const, schoolId: profile.school_id as string, user, admin }
}

export async function ensureBadgesAction(): Promise<
  { ok: true; assigned: number } | { ok: false; error: string }
> {
  const access = await requireBadgeAdmin()
  if (!access.ok) return access
  try {
    await ensureDefaultRooms(access.schoolId)
    const assigned = await ensureStudentBadgeCodes(access.schoolId)
    revalidatePath('/principal/badges')
    return { ok: true, assigned }
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : 'Could not assign badges. Run pending-011-badge-kiosk.sql?',
    }
  }
}

export async function saveRoomAction(input: {
  id?: string
  name: string
  kind: RoomKind
  classId?: string | null
  billable?: boolean
  rateCentsPerHour?: number
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireBadgeAdmin()
  if (!access.ok) return access
  const r = await upsertRoom(access.schoolId, input)
  if (!r.ok) return r
  revalidatePath('/principal/badges')
  revalidatePath('/kiosk')
  return { ok: true }
}

export async function getKioskLinkAction(): Promise<
  { ok: true; token: string; path: string } | { ok: false; error: string }
> {
  const access = await requireBadgeAdmin()
  if (!access.ok) return access
  try {
    await ensureDefaultRooms(access.schoolId)
    const token = await getOrCreateKioskToken(access.schoolId)
    return { ok: true, token, path: `/kiosk/${token}` }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Kiosk setup failed' }
  }
}

export async function billAftercareAction(): Promise<
  | { ok: true; billed: number; totalCents: number; errors: string[] }
  | { ok: false; error: string }
> {
  const access = await requireBadgeAdmin()
  if (!access.ok) return access
  const r = await billClosedAftercareSessions(access.schoolId)
  revalidatePath('/principal/badges')
  revalidatePath('/principal/invoices')
  return { ok: true, ...r }
}

/** Kiosk scan — authorized by kiosk token (no staff login on tablet). */
export async function kioskScanAction(input: {
  token: string
  rawCode?: string
  studentId?: string
  roomId: string
  direction: ScanDirection
  kioskLabel?: string
}): Promise<Awaited<ReturnType<typeof processBadgeScan>>> {
  const school = await resolveSchoolByKioskToken(input.token)
  if (!school) {
    return { ok: false, error: 'Invalid kiosk link. Open kiosk from Principal → Badges.' }
  }
  return processBadgeScan({
    schoolId: school.schoolId,
    rawCode: input.rawCode,
    studentId: input.studentId,
    roomId: input.roomId,
    direction: input.direction,
    kioskLabel: input.kioskLabel || 'Room kiosk',
    source: 'kiosk',
  })
}

export async function kioskSearchAction(input: {
  token: string
  query: string
}): Promise<
  | { ok: true; students: Awaited<ReturnType<typeof searchKioskStudents>> }
  | { ok: false; error: string }
> {
  const school = await resolveSchoolByKioskToken(input.token)
  if (!school) return { ok: false, error: 'Invalid kiosk.' }
  const students = await searchKioskStudents(school.schoolId, input.query)
  return { ok: true, students }
}

export async function kioskPresenceAction(input: {
  token: string
  roomId: string
}): Promise<
  | { ok: true; present: Awaited<ReturnType<typeof listRoomPresence>> }
  | { ok: false; error: string }
> {
  const school = await resolveSchoolByKioskToken(input.token)
  if (!school) return { ok: false, error: 'Invalid kiosk.' }
  const present = await listRoomPresence(school.schoolId, input.roomId)
  return { ok: true, present }
}

/** Staff can scan while logged in (office laptop). */
export async function staffScanAction(input: {
  rawCode?: string
  studentId?: string
  roomId: string
  direction: ScanDirection
}): Promise<Awaited<ReturnType<typeof processBadgeScan>>> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('school_id, role, email')
    .eq('id', user.id)
    .maybeSingle()
  const role = effectiveRole(
    profile
      ? { role: profile.role as Role, email: profile.email as string | null }
      : null
  )
  if (!profile?.school_id || !isSchoolStaff(role)) {
    return { ok: false, error: 'Staff only.' }
  }
  return processBadgeScan({
    schoolId: profile.school_id,
    rawCode: input.rawCode,
    studentId: input.studentId,
    roomId: input.roomId,
    direction: input.direction,
    kioskLabel: 'Staff desk',
    source: 'staff',
  })
}

export async function staffRoomsAction(): Promise<
  | { ok: true; rooms: Awaited<ReturnType<typeof listRooms>>; schoolId: string }
  | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('school_id, role, email')
    .eq('id', user.id)
    .maybeSingle()
  const role = effectiveRole(
    profile
      ? { role: profile.role as Role, email: profile.email as string | null }
      : null
  )
  if (!profile?.school_id || !isSchoolStaff(role)) {
    return { ok: false, error: 'Staff only.' }
  }
  await ensureDefaultRooms(profile.school_id)
  const rooms = await listRooms(profile.school_id)
  return { ok: true, rooms, schoolId: profile.school_id }
}

export async function loadBadgeDashboardAction() {
  const access = await requireBadgeAdmin()
  if (!access.ok) return access
  await ensureDefaultRooms(access.schoolId)
  const brand = await import('@/lib/school-brand').then((m) =>
    m.loadSchoolBrand(access.schoolId)
  )
  const [badges, rooms, scans, openAftercare, token] = await Promise.all([
    listStudentBadges(access.schoolId, brand.name),
    listRooms(access.schoolId),
    listRecentScans(access.schoolId, 30),
    listOpenAftercare(access.schoolId),
    getOrCreateKioskToken(access.schoolId),
  ])
  return {
    ok: true as const,
    badges,
    rooms,
    scans,
    openAftercare,
    kioskPath: `/kiosk/${token}`,
  }
}

export async function setStudentRfidAction(input: {
  studentId: string
  rfidUid: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const access = await requireBadgeAdmin()
  if (!access.ok) return access
  const r = await setStudentRfidUid(
    access.schoolId,
    input.studentId,
    input.rfidUid.trim() || null
  )
  if (r.ok) revalidatePath('/principal/badges')
  return r
}

export async function getDeviceTokenAction(): Promise<
  | {
      ok: true
      deviceToken: string
      apiPath: string
      emailLive: boolean
      smsConfigured: boolean
      notifyParents: boolean
    }
  | { ok: false; error: string }
> {
  const access = await requireBadgeAdmin()
  if (!access.ok) return access
  try {
    const [deviceToken, notifyParents] = await Promise.all([
      getOrCreateDeviceToken(access.schoolId),
      getAftercareNotifyPreference(access.schoolId),
    ])
    return {
      ok: true,
      deviceToken,
      apiPath: '/api/kiosk/device-scan',
      emailLive: isEmailLive(),
      smsConfigured: isSmsConfigured(),
      notifyParents,
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Device token failed' }
  }
}

export async function rotateDeviceTokenAction(): Promise<
  { ok: true; deviceToken: string } | { ok: false; error: string }
> {
  const access = await requireBadgeAdmin()
  if (!access.ok) return access
  try {
    const deviceToken = await rotateDeviceToken(access.schoolId)
    revalidatePath('/principal/badges')
    return { ok: true, deviceToken }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Rotate failed' }
  }
}

export async function setAftercareNotifyAction(enabled: boolean): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const access = await requireBadgeAdmin()
  if (!access.ok) return access
  try {
    await setAftercareNotifyPreference(access.schoolId, enabled)
    revalidatePath('/principal/badges')
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Save failed' }
  }
}

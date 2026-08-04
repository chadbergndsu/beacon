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
  getOrCreateKioskToken,
  listOpenAftercare,
  listRecentScans,
  listRooms,
  listStudentBadges,
  processBadgeScan,
  resolveSchoolByKioskToken,
  upsertRoom,
} from '@/lib/badge/store'

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
  rawCode: string
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
    roomId: input.roomId,
    direction: input.direction,
    kioskLabel: input.kioskLabel || 'Room kiosk',
    source: 'kiosk',
  })
}

/** Staff can scan while logged in (office laptop). */
export async function staffScanAction(input: {
  rawCode: string
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
    roomId: input.roomId,
    direction: input.direction,
    kioskLabel: 'Staff desk',
    source: 'staff',
  })
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

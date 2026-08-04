import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import {
  ensureDefaultRooms,
  listRooms,
  resolveSchoolByKioskToken,
} from '@/lib/badge/store'
import { KIOSK_COOKIE } from '@/lib/badge/kiosk-cookie'
import { KioskScanner } from '@/components/badge/KioskScanner'

/**
 * Cookie-session kiosk (no long-lived secret in the address bar after bootstrap).
 * Bootstrap still happens via /kiosk/[token], which sets the cookie and redirects here.
 */
export default async function KioskSessionPage() {
  const jar = await cookies()
  const token = jar.get(KIOSK_COOKIE)?.value?.trim() || ''
  if (!token || token.length < 12) notFound()

  const school = await resolveSchoolByKioskToken(token)
  if (!school) {
    // Drop bad/stale cookie so refresh does not loop a dead session
    try {
      jar.delete(KIOSK_COOKIE)
    } catch {
      /* ignore */
    }
    notFound()
  }

  try {
    await ensureDefaultRooms(school.schoolId)
  } catch {
    // tables missing — scanner will surface errors
  }

  let rooms: Awaited<ReturnType<typeof listRooms>> = []
  try {
    rooms = await listRooms(school.schoolId)
  } catch {
    rooms = []
  }

  // Client does not need the raw token — server actions read the cookie
  return (
    <KioskScanner token="" schoolName={school.schoolName} rooms={rooms} useCookie />
  )
}

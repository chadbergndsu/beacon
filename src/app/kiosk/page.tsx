import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import {
  ensureDefaultRooms,
  listRoomsResult,
  resolveSchoolByKioskToken,
} from '@/lib/badge/store'
import { KIOSK_COOKIE } from '@/lib/badge/kiosk-cookie'
import { KioskScanner } from '@/components/badge/KioskScanner'

/**
 * Cookie-session kiosk (no long-lived secret in the address bar after bootstrap).
 */
export default async function KioskSessionPage() {
  const jar = await cookies()
  const token = jar.get(KIOSK_COOKIE)?.value?.trim() || ''
  if (!token || token.length < 12) notFound()

  const school = await resolveSchoolByKioskToken(token)
  if (!school) {
    try {
      jar.delete(KIOSK_COOKIE)
    } catch {
      /* ignore */
    }
    notFound()
  }

  let setupError: string | null = null
  try {
    await ensureDefaultRooms(school.schoolId)
  } catch (e) {
    setupError = e instanceof Error ? e.message : 'Could not ensure default rooms.'
  }

  const roomsRes = await listRoomsResult(school.schoolId)
  const rooms = roomsRes.ok ? roomsRes.rooms : []
  if (!roomsRes.ok) setupError = roomsRes.error

  return (
    <div>
      {setupError && (
        <div className="bg-amber-500 px-4 py-3 text-center text-sm font-semibold text-amber-950">
          Setup: {setupError}
        </div>
      )}
      <KioskScanner token="" schoolName={school.schoolName} rooms={rooms} useCookie />
    </div>
  )
}

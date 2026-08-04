import { notFound } from 'next/navigation'
import {
  ensureDefaultRooms,
  listRooms,
  resolveSchoolByKioskToken,
} from '@/lib/badge/store'
import { KioskScanner } from '@/components/badge/KioskScanner'

export default async function KioskPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const school = await resolveSchoolByKioskToken(token)
  if (!school) notFound()

  try {
    await ensureDefaultRooms(school.schoolId)
  } catch {
    // tables missing — still show kiosk with empty rooms + scan will error helpfully
  }

  let rooms: Awaited<ReturnType<typeof listRooms>> = []
  try {
    rooms = await listRooms(school.schoolId)
  } catch {
    rooms = []
  }

  return (
    <KioskScanner token={token} schoolName={school.schoolName} rooms={rooms} />
  )
}

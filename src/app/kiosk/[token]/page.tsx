import { notFound, redirect } from 'next/navigation'
import { resolveSchoolByKioskToken } from '@/lib/badge/store'

/**
 * Token bootstrap is handled in middleware (sets HttpOnly cookie + redirects to /kiosk).
 * This page is a fallback if middleware did not run (e.g. local edge cases).
 */
export default async function KioskTokenFallbackPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const school = await resolveSchoolByKioskToken(token)
  if (!school) notFound()
  // Prefer cookie session URL; middleware should already have redirected.
  redirect('/kiosk')
}

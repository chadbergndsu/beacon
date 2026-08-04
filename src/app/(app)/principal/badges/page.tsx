import { requirePrincipal } from '@/lib/principal'
import { loadSchoolBrand } from '@/lib/school-brand'
import {
  ensureDefaultRooms,
  ensureStudentBadgeCodes,
  getAccessTokenMeta,
  getAftercareNotifyPreference,
  listOpenAftercare,
  listRecentScans,
  listRooms,
  listStudentBadges,
} from '@/lib/badge/store'
import { isSmsConfigured } from '@/lib/sms/twilio'
import { isEmailLive } from '@/lib/email/transport'
import { BadgesAdmin } from '@/components/badge/BadgesAdmin'

export default async function PrincipalBadgesPage() {
  const { schoolId } = await requirePrincipal()
  const brand = await loadSchoolBrand(schoolId)

  let badges: Awaited<ReturnType<typeof listStudentBadges>> = []
  let rooms: Awaited<ReturnType<typeof listRooms>> = []
  let scans: Awaited<ReturnType<typeof listRecentScans>> = []
  let openAftercare: Awaited<ReturnType<typeof listOpenAftercare>> = []
  let kioskPath = '/kiosk'
  let deviceToken = ''
  let kioskExpiresAt: string | null = null
  let deviceExpiresAt: string | null = null
  let notifyParents = true
  let setupError: string | null = null

  try {
    await ensureDefaultRooms(schoolId)
    await ensureStudentBadgeCodes(schoolId)
    const meta = await getAccessTokenMeta(schoolId)
    kioskPath = `/kiosk/${meta.kiosk_token}`
    deviceToken = meta.device_token
    kioskExpiresAt = meta.kiosk_token_expires_at
    deviceExpiresAt = meta.device_token_expires_at
    ;[badges, rooms, scans, openAftercare, notifyParents] = await Promise.all([
      listStudentBadges(schoolId, brand.name),
      listRooms(schoolId),
      listRecentScans(schoolId, 40),
      listOpenAftercare(schoolId),
      getAftercareNotifyPreference(schoolId),
    ])
  } catch (e) {
    setupError =
      e instanceof Error
        ? e.message
        : 'Badge tables may be missing — apply migration 011 (npm run db:migrate).'
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">
          Rooms · attendance · aftercare
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy dark:text-sky-50">
          Badges &amp; kiosk
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Kids scan in and out of rooms for class attendance and after-school tracking. Closed
          aftercare sessions can create invoices for payments. Parents get email (and optional SMS)
          on aftercare check-in/out.
        </p>
      </div>

      {setupError && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">Setup needed</p>
          <p className="mt-1 text-xs">{setupError}</p>
          <p className="mt-2 text-xs">
            Prefer <code className="rounded bg-white px-1">npm run db:migrate</code> (migrations
            001–018 under <code className="rounded bg-white px-1">supabase/migrations/</code>).
            Badge/kiosk 011–012; token vault 015; RLS 016; token expiry 018.
          </p>
        </div>
      )}

      <BadgesAdmin
        schoolName={brand.name}
        schoolSlug={brand.shortName?.toLowerCase().replace(/\s+/g, '-') || 'school'}
        initialBadges={badges}
        initialRooms={rooms}
        initialScans={scans}
        initialOpenAftercare={openAftercare}
        initialKioskPath={kioskPath}
        initialDeviceToken={deviceToken}
        initialKioskExpiresAt={kioskExpiresAt}
        initialDeviceExpiresAt={deviceExpiresAt}
        initialNotifyParents={notifyParents}
        emailLive={isEmailLive()}
        smsConfigured={isSmsConfigured()}
      />
    </div>
  )
}

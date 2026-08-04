import { cookies } from 'next/headers'
import { getProfile } from '@/lib/auth'
import { loadUserPreferences } from '@/lib/view-prefs/store'
import { SkinPicker } from '@/components/skins/SkinPicker'
import {
  DEFAULT_SKIN,
  SKIN_COOKIE,
  parseSkinId,
} from '@/lib/skins/catalog'
import Link from 'next/link'
import { isSchoolStaff, effectiveRole } from '@/lib/roles'
import type { Role } from '@/lib/types'

export default async function SettingsPage() {
  const { profile, user } = await getProfile()
  const jar = await cookies()
  let skin = parseSkinId(jar.get(SKIN_COOKIE)?.value || DEFAULT_SKIN)
  if (user?.id) {
    const prefs = await loadUserPreferences(user.id)
    if (prefs.skin) skin = parseSkinId(prefs.skin)
  }

  const role = effectiveRole(
    profile
      ? { role: profile.role as Role, email: profile.email }
      : null
  )
  const staff = isSchoolStaff(role)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Your preferences
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy dark:text-sky-50">
          Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Choose how Beacon looks for you. Skins are personal — classmates and parents keep their
          own picks.
        </p>
      </div>

      <div id="skins">
        <SkinPicker currentSkin={skin} />
      </div>

      {staff && (
        <p className="text-sm text-muted-foreground">
          Teachers &amp; staff:{' '}
          <Link href="/teacher/settings" className="font-semibold text-sky-700 underline">
            Class weights, gradebook shortcuts →
          </Link>
        </p>
      )}
    </div>
  )
}

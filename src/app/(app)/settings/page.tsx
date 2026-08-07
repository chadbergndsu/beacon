import { cookies } from 'next/headers'
import { getProfile } from '@/lib/auth'
import { loadUserPreferences } from '@/lib/view-prefs/store'
import { SkinPicker } from '@/components/skins/SkinPicker'
import { PageHeader } from '@/components/ui/page-header'
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
    <div className="page-stack">
      <PageHeader
        eyebrow="Your preferences"
        title="Settings"
        description="Choose how Beacon looks for you. Skins are personal — classmates and parents keep their own picks."
      />

      <div id="skins">
        <SkinPicker currentSkin={skin} />
      </div>

      {staff && (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Teachers &amp; staff:{' '}
            <Link href="/teacher/settings" className="font-medium text-primary hover:underline">
              Class weights, gradebook shortcuts →
            </Link>
          </p>
          <p>
            Campus twin:{' '}
            <Link href="/craft" className="font-medium text-primary hover:underline">
              Open Craft →
            </Link>{' '}
            (More menu on mobile)
          </p>
        </div>
      )}
    </div>
  )
}

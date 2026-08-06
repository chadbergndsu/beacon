import { cookies } from 'next/headers'
import { AppHeader } from '@/components/layout/AppHeader'
import { TrustModeBanner } from '@/components/ops/TrustModeBanner'
import { PilotSuggestionButton } from '@/components/pilot/PilotSuggestionButton'
import { SkinProvider } from '@/components/skins/SkinProvider'
import { getProfile } from '@/lib/auth'
import { loadSchoolBrand } from '@/lib/school-brand'
import { isQuickBooksConfigured } from '@/lib/billing/quickbooks'
import { loadUserPreferences } from '@/lib/view-prefs/store'
import {
  DEFAULT_SKIN,
  SKIN_COOKIE,
  parseSkinId,
  type SkinId,
} from '@/lib/skins/catalog'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user } = await getProfile()
  const brand = await loadSchoolBrand(profile?.school_id)
  const { isEmailHonestLive } = await import('@/lib/email/transport')
  const emailLive = isEmailHonestLive()
  const qbLive = isQuickBooksConfigured()
  const firstName = profile?.full_name?.trim().split(/\s+/)[0] || null

  const jar = await cookies()
  let skin: SkinId = parseSkinId(jar.get(SKIN_COOKIE)?.value || DEFAULT_SKIN)
  if (user?.id) {
    const prefs = await loadUserPreferences(user.id)
    if (prefs.skin) skin = parseSkinId(prefs.skin)
  }

  return (
    <SkinProvider initialSkin={skin}>
      <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden beacon-shell">
        <AppHeader profile={profile} schoolShortName={brand.shortName} />
        <TrustModeBanner emailLive={emailLive} qbLiveConfigured={qbLive} role={profile?.role} />
        <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6">
          <div className="animate-beacon-in min-w-0">{children}</div>
        </main>
        <footer className="border-t border-border/70 px-4 py-3 pb-safe text-center text-[11px] text-muted-foreground">
          Beacon · {brand.name}
          {brand.websiteUrl ? (
            <>
              {' · '}
              <a
                href={brand.websiteUrl}
                className="text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                School website
              </a>
            </>
          ) : null}
        </footer>
        {profile ? <PilotSuggestionButton userLabel={firstName} /> : null}
      </div>
    </SkinProvider>
  )
}

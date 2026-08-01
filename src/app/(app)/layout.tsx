import { AppHeader } from '@/components/layout/AppHeader'
import { TrustModeBanner } from '@/components/ops/TrustModeBanner'
import { getProfile } from '@/lib/auth'
import { loadSchoolBrand } from '@/lib/school-brand'
import { isQuickBooksConfigured } from '@/lib/billing/quickbooks'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getProfile()
  const brand = await loadSchoolBrand(profile?.school_id)
  const emailLive = Boolean(process.env.RESEND_API_KEY?.trim())
  const qbLive = isQuickBooksConfigured()

  return (
    <div className="flex min-h-screen min-h-[100dvh] flex-col overflow-x-hidden beacon-shell">
      <AppHeader profile={profile} schoolShortName={brand.shortName} />
      <TrustModeBanner emailLive={emailLive} qbLiveConfigured={qbLive} role={profile?.role} />
      <main className="mx-auto w-full max-w-7xl min-w-0 flex-1 px-3 py-4 sm:px-6 sm:py-8">
        <div className="animate-beacon-in min-w-0">{children}</div>
      </main>
      <footer className="border-t border-border/70 bg-card/50 px-3 py-4 pb-safe text-center text-xs text-muted-foreground">
        Beacon · {brand.name}
        {brand.websiteUrl ? (
          <>
            {' · '}
            <a
              href={brand.websiteUrl}
              className="text-sky-700 hover:underline"
              target="_blank"
              rel="noreferrer"
            >
              School website
            </a>
          </>
        ) : null}
      </footer>
    </div>
  )
}

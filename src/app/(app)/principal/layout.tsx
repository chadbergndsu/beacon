import Link from 'next/link'
import { PrincipalNav } from '@/components/principal/PrincipalNav'
import { LeadershipQuoteTicker } from '@/components/principal/LeadershipQuoteTicker'
import { buttonClassName } from '@/components/ui/button'
import { requirePrincipal } from '@/lib/principal'
import { officeShellMeta } from '@/lib/principal/office-shell'
import { leadershipQuoteForDate } from '@/lib/principal/leadership-quotes'
import { isOfficeAdmin } from '@/lib/roles'

export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePrincipal()
  const shell = officeShellMeta(profile)
  const leadershipQuote = leadershipQuoteForDate()
  const officeAdmin = isOfficeAdmin(profile.role)

  return (
    <div className="page-stack animate-beacon-in">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border/70 px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {shell.kicker}
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{shell.title}</h1>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {shell.subtitle}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Link href="/craft" className={buttonClassName('outline', 'sm')}>
              Craft
            </Link>
            {officeAdmin ? (
              <Link href="/admin/emails" className={buttonClassName('outline', 'sm')}>
                Comms
              </Link>
            ) : null}
            <Link href="/principal/release" className={buttonClassName('primary', 'sm')}>
              Go-live
            </Link>
            <Link href="/about" className={buttonClassName('outline', 'sm')}>
              About Beacon
            </Link>
          </div>
        </div>
        <div className="bg-muted/30 px-4 py-3.5 sm:px-6">
          <PrincipalNav officeAdmin={officeAdmin} />
        </div>
        {shell.showLeadershipQuote ? (
          <div className="border-t border-border/70 bg-card px-4 py-3 sm:px-6">
            <LeadershipQuoteTicker quote={leadershipQuote} />
          </div>
        ) : null}
      </div>
      {children}
    </div>
  )
}

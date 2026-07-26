import Link from 'next/link'
import { PrincipalNav } from '@/components/principal/PrincipalNav'
import { requirePrincipal } from '@/lib/principal'

export default async function PrincipalLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requirePrincipal()

  return (
    <div className="space-y-6 animate-beacon-in">
      <div className="rounded-3xl border border-sky-100 dark:border-sky-900/40 overflow-hidden shadow-[var(--shadow-soft)]">
        <div className="bg-gradient-to-r from-navy via-slate-900 to-sky-900 px-6 py-6 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
            Principal layer · Chris Cowan
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {profile.full_name || 'Principal'} · School operations
              </h1>
              <p className="mt-1 text-sm text-slate-300 max-w-2xl">
                Grades for families. Payments & QuickBooks for the office. Built under your
                direction — profit supports LBC teachers, tuition, and well-earned rest.
              </p>
            </div>
            <Link
              href="/about"
              className="rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-sm font-medium hover:bg-white/15"
            >
              About Beacon
            </Link>
          </div>
        </div>
        <div className="bg-card px-4 py-3 border-t border-border/60">
          <PrincipalNav />
        </div>
      </div>
      {children}
    </div>
  )
}

import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import type { Profile } from '@/lib/types'

export function AppHeader({ profile }: { profile: Profile | null }) {
  const staff = profile && ['admin', 'staff', 'teacher'].includes(profile.role)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 text-navy-foreground backdrop-blur-md shadow-[var(--shadow-soft)]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-8 min-w-0">
          <Link href="/dashboard" className="min-w-0 group">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500 text-sm font-black text-white shadow-lg shadow-sky-500/25 group-hover:scale-105 transition">
                B
              </span>
              <div>
                <p className="font-bold tracking-tight text-[15px] leading-none">Beacon</p>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-sky-300/90 mt-1">
                  Lighthouse Christian Academy
                </p>
              </div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-1 text-sm">
            {[
              { href: '/dashboard', label: 'Dashboard' },
              { href: '/announcements', label: 'Announcements' },
              ...(staff ? [{ href: '/admin/emails', label: 'Emails' }] : []),
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-3 py-2 text-slate-200/90 hover:bg-white/10 hover:text-white transition font-medium"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {profile && (
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold truncate max-w-[180px]">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[10px] uppercase tracking-[0.14em] text-sky-300/80 font-semibold">
                {profile.role}
              </p>
            </div>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 px-3.5 py-2 text-sm font-medium transition"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
      <nav className="md:hidden px-4 pb-3 flex gap-2 text-sm overflow-x-auto">
        <Link href="/dashboard" className="rounded-lg bg-white/10 px-3 py-1.5 whitespace-nowrap">
          Dashboard
        </Link>
        <Link href="/announcements" className="rounded-lg bg-white/10 px-3 py-1.5 whitespace-nowrap">
          Announcements
        </Link>
        {staff && (
          <Link href="/admin/emails" className="rounded-lg bg-white/10 px-3 py-1.5 whitespace-nowrap">
            Emails
          </Link>
        )}
      </nav>
    </header>
  )
}

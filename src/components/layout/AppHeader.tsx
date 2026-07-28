import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import { canAccessEmailOutbox, roleLabel } from '@/lib/roles'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AppHeader({ profile }: { profile: Profile | null }) {
  const role = profile?.role ?? null
  const staff = canAccessEmailOutbox(role)
  const isPrincipal = role === 'principal'

  const nav = [
    { href: '/dashboard', label: 'Home' },
    ...(isPrincipal ? [{ href: '/principal', label: 'Principal office' }] : []),
    { href: '/announcements', label: 'Announcements' },
    ...(staff ? [{ href: '/admin/emails', label: 'Emails' }] : []),
    { href: '/school', label: 'School site' },
    { href: '/about', label: 'About' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#06101f]/90 text-white backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-8">
          <Link href="/dashboard" className="group flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-black text-white shadow-lg shadow-sky-500/25 transition group-hover:scale-105">
              B
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-none tracking-tight">Beacon</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/85">
                School suite · LCA
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex" aria-label="Main">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium text-slate-200/90 transition',
                  'hover:bg-white/10 hover:text-white',
                  item.href === '/principal' && 'text-sky-200'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {profile && (
            <div className="hidden text-right sm:block">
              <p className="max-w-[180px] truncate text-sm font-semibold">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/80">
                {roleLabel(role)}
              </p>
            </div>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-xl border border-white/10 bg-white/10 px-3.5 py-2 text-sm font-medium transition hover:bg-white/15"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <nav
        className="flex gap-1.5 overflow-x-auto px-4 pb-3 text-sm md:hidden"
        aria-label="Mobile"
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-1.5 font-medium',
              item.href === '/principal' ? 'bg-sky-500/90 text-white' : 'bg-white/10 text-slate-100'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

import Link from 'next/link'
import { logout } from '@/app/actions/auth'
import { canAccessEmailOutbox, isSchoolStaff, roleLabel } from '@/lib/roles'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

export function AppHeader({
  profile,
  schoolShortName = 'School',
}: {
  profile: Profile | null
  schoolShortName?: string
}) {
  const role = profile?.role ?? null
  const staff = canAccessEmailOutbox(role)
  const isPrincipal = role === 'principal' || role === 'admin'
  const showQuick = isSchoolStaff(role)

  const nav = [
    { href: '/dashboard', label: 'Home' },
    ...(showQuick ? [{ href: '/teacher/quick', label: 'Quick mode', highlight: true }] : []),
    ...(showQuick ? [{ href: '/teacher/lessons', label: 'Lesson plans' }] : []),
    ...(showQuick ? [{ href: '/teacher/calendar', label: 'Calendar' }] : []),
    ...(isPrincipal ? [{ href: '/principal', label: 'Principal office' }] : []),
    ...(isPrincipal ? [{ href: '/principal/release', label: 'Go-live' }] : []),
    { href: '/announcements', label: 'Announcements' },
    ...(staff ? [{ href: '/admin/emails', label: 'Emails' }] : []),
    { href: '/school', label: 'School site' },
    { href: '/about', label: 'About' },
  ]

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#06101f]/95 text-white backdrop-blur-xl pt-safe">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 sm:py-3">
        <div className="flex min-w-0 items-center gap-4 md:gap-8">
          <Link href="/dashboard" className="group flex min-w-0 items-center gap-2 sm:gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-black text-white shadow-lg shadow-sky-500/25 transition group-hover:scale-105 sm:h-9 sm:w-9">
              B
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold leading-none tracking-tight">Beacon</p>
              <p className="mt-0.5 hidden text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/85 sm:mt-1 sm:block">
                School suite · {schoolShortName}
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
                  item.href === '/principal' && 'text-sky-200',
                  'highlight' in item &&
                    item.highlight &&
                    'bg-sky-500/20 text-sky-100 hover:bg-sky-500/30'
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
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
          {showQuick && (
            <Link
              href="/teacher/quick"
              className="rounded-xl bg-sky-500 px-2.5 py-2 text-xs font-bold text-white shadow-md shadow-sky-500/25 hover:bg-sky-400 sm:hidden"
            >
              Quick
            </Link>
          )}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-xl border border-white/10 bg-white/10 px-2.5 py-2 text-xs font-medium transition hover:bg-white/15 sm:px-3.5 sm:text-sm"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      <nav
        className="mobile-scroll-x gap-1.5 px-3 pb-2.5 text-sm md:hidden sm:px-4"
        aria-label="Mobile"
      >
        {nav.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 font-medium',
              item.href === '/principal'
                ? 'bg-sky-500/90 text-white'
                : 'highlight' in item && item.highlight
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white/10 text-slate-100'
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { resolveActiveNavHref } from '@/lib/nav-active'
import { canAccessEmailOutbox, isSchoolStaff, roleLabel } from '@/lib/roles'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string }

function buildNav(role: Profile['role'] | null): NavItem[] {
  const isPrincipal = role === 'principal' || role === 'admin'
  const staff = canAccessEmailOutbox(role)
  const teacherTools = isSchoolStaff(role) && !isPrincipal

  // Principal: lean top bar — full suite lives under Office + principal subnav
  if (isPrincipal) {
    return [
      { href: '/dashboard', label: 'Home' },
      { href: '/principal', label: 'Office' },
      { href: '/principal/roster', label: 'Roster' },
      { href: '/principal/approvals', label: 'Approvals' },
      { href: '/principal/release', label: 'Go-live' },
      { href: '/principal/badges', label: 'Badges' },
      { href: '/announcements', label: 'Announcements' },
      ...(staff ? [{ href: '/admin/emails', label: 'Comms' }] : []),
      { href: '/settings', label: 'Settings' },
      { href: '/teacher/quick', label: 'Quick' },
      { href: '/school', label: 'School' },
    ]
  }

  // Teachers / staff
  if (teacherTools || isSchoolStaff(role)) {
    return [
      { href: '/dashboard', label: 'Home' },
      { href: '/teacher/classroom', label: 'Classroom' },
      { href: '/teacher/quick', label: 'Quick' },
      { href: '/teacher/lessons', label: 'Lessons' },
      { href: '/teacher/calendar', label: 'Calendar' },
      { href: '/teacher/printables', label: 'Printables' },
      { href: '/teacher/scan', label: 'Scan' },
      { href: '/announcements', label: 'Announcements' },
      ...(staff ? [{ href: '/admin/emails', label: 'Comms' }] : []),
      { href: '/settings', label: 'Settings' },
      { href: '/school', label: 'School' },
    ]
  }

  // Parents / others
  return [
    { href: '/dashboard', label: 'Home' },
    { href: '/announcements', label: 'Announcements' },
    { href: '/settings', label: 'Settings' },
    { href: '/school', label: 'School' },
    { href: '/about', label: 'About' },
  ]
}

export function AppHeader({
  profile,
  schoolShortName = 'School',
}: {
  profile: Profile | null
  schoolShortName?: string
}) {
  const pathname = usePathname() || '/'
  const role = profile?.role ?? null
  const showQuick = isSchoolStaff(role)
  const nav = buildNav(role)

  const activeHref = resolveActiveNavHref(
    pathname,
    nav.map((item) => item.href)
  )

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-[#06101f] text-white pt-safe">
      {/* Row 1: brand + user — never shares space with nav links */}
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
        <Link
          href="/dashboard"
          className="group flex min-w-0 shrink items-center gap-2 sm:gap-2.5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-black text-white shadow-lg shadow-sky-500/25 transition group-hover:scale-105 sm:h-9 sm:w-9">
            B
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-none tracking-tight">Beacon</p>
            <p className="mt-0.5 hidden truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-300/85 sm:mt-1 sm:block">
              School suite · {schoolShortName}
            </p>
          </div>
        </Link>

        <div className="relative z-20 flex shrink-0 items-center gap-1.5 sm:gap-2">
          {profile && (
            <div className="hidden max-w-[9.5rem] rounded-lg bg-[#06101f] px-2 py-1 text-right sm:block lg:max-w-[12rem]">
              <p className="truncate text-sm font-semibold leading-tight">
                {profile.full_name || profile.email}
              </p>
              <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-300/80">
                {roleLabel(role)}
              </p>
            </div>
          )}
          {profile && (
            <Link
              href="/settings#skins"
              className="shrink-0 rounded-xl border border-white/10 bg-white/10 px-2.5 py-2 text-xs font-medium transition hover:bg-white/15"
              title="Change Beacon skin"
            >
              Skin
            </Link>
          )}
          {showQuick && (
            <Link
              href="/teacher/quick"
              className={cn(
                'shrink-0 rounded-xl px-2.5 py-2 text-xs font-bold text-white shadow-md sm:hidden',
                activeHref === '/teacher/quick'
                  ? 'bg-emerald-500 shadow-emerald-500/25'
                  : 'bg-sky-500 shadow-sky-500/25 hover:bg-sky-400'
              )}
            >
              Quick
            </Link>
          )}
          <form action={logout} className="shrink-0">
            <button
              type="submit"
              className="rounded-xl border border-white/10 bg-white/10 px-2.5 py-2 text-xs font-medium transition hover:bg-white/15 sm:px-3.5 sm:text-sm"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Row 2: scrollable nav — all breakpoints, never under user chip */}
      <nav
        className="mobile-scroll-x gap-1.5 border-t border-white/[0.06] px-3 py-2 text-sm sm:px-6"
        aria-label="Main"
      >
        {nav.map((item) => {
          const active = item.href === activeHref
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 font-medium transition',
                active
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25'
                  : 'bg-white/10 text-slate-100 hover:bg-white/15'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}

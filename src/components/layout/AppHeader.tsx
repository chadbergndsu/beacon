'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/actions/auth'
import { resolveActiveNavHref } from '@/lib/nav-active'
import { canAccessEmailOutbox, isSchoolStaff, roleLabel } from '@/lib/roles'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'

type NavItem = { href: string; label: string }

/**
 * Role-aware primary nav — short labels, no duplicate “levels” mixed in one blob.
 * Principals: school leadership links (teacher tools live under Office pages / Quick).
 * Teachers: classroom tools.
 * Parents: family links only.
 */
export function buildNav(role: Profile['role'] | null): NavItem[] {
  const isPrincipal = role === 'principal' || role === 'admin'
  const staffComms = canAccessEmailOutbox(role)

  if (isPrincipal) {
    return [
      { href: '/dashboard', label: 'Home' },
      { href: '/principal', label: 'Office' },
      { href: '/principal/roster', label: 'Roster' },
      { href: '/principal/approvals', label: 'Approvals' },
      { href: '/principal/badges', label: 'Badges' },
      { href: '/principal/release', label: 'Go-live' },
      { href: '/announcements', label: 'News' },
      ...(staffComms ? [{ href: '/admin/emails', label: 'Comms' }] : []),
      { href: '/settings', label: 'Settings' },
      { href: '/school', label: 'School site' },
    ]
  }

  if (isSchoolStaff(role)) {
    return [
      { href: '/dashboard', label: 'Home' },
      { href: '/teacher/classroom', label: 'Classroom' },
      { href: '/teacher/quick', label: 'Quick' },
      { href: '/teacher/lessons', label: 'Lessons' },
      { href: '/teacher/calendar', label: 'Calendar' },
      { href: '/teacher/printables', label: 'Printables' },
      { href: '/teacher/scan', label: 'Scan' },
      { href: '/announcements', label: 'News' },
      ...(staffComms ? [{ href: '/admin/emails', label: 'Comms' }] : []),
      { href: '/settings', label: 'Settings' },
      { href: '/school', label: 'School site' },
    ]
  }

  return [
    { href: '/dashboard', label: 'Home' },
    { href: '/announcements', label: 'News' },
    { href: '/settings', label: 'Settings' },
    { href: '/school', label: 'School site' },
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
  const nav = buildNav(role)
  const activeHref = resolveActiveNavHref(
    pathname,
    nav.map((item) => item.href)
  )
  const displayName = profile?.full_name?.trim() || profile?.email || 'Account'
  const roleText = roleLabel(role)

  return (
    <header className="sticky top-0 z-50 text-white pt-safe">
      {/* ── Level 1: brand + identity (never shares a row with nav links) ── */}
      <div className="border-b border-white/10 bg-[#030a14]">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-3 py-3 sm:px-6">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 text-sm font-black shadow-md shadow-sky-500/20">
              B
            </span>
            <div className="min-w-0 leading-tight">
              <p className="text-base font-bold tracking-tight">Beacon</p>
              <p className="truncate text-[11px] font-medium text-sky-300/90">
                {schoolShortName}
              </p>
            </div>
          </Link>

          <div className="flex shrink-0 items-center gap-2">
            {profile && (
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-3 pr-1.5 sm:flex">
                <div className="min-w-0 text-right">
                  <p className="max-w-[10rem] truncate text-xs font-semibold leading-none lg:max-w-[14rem]">
                    {displayName}
                  </p>
                  {roleText ? (
                    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-sky-300/75">
                      {roleText}
                    </p>
                  ) : null}
                </div>
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-600 text-xs font-bold"
                  aria-hidden
                >
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            {profile && (
              <Link
                href="/settings#skins"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10"
              >
                Skin
              </Link>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:bg-white/10 sm:px-3.5"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Level 2: primary navigation (own bar, own scroll) ── */}
      <div className="border-b border-white/10 bg-[#0a1628]">
        <div className="mx-auto max-w-7xl px-2 sm:px-4">
          <nav
            className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Main navigation"
          >
            {nav.map((item) => {
              const active = item.href === activeHref
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition whitespace-nowrap',
                    active
                      ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  )}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}

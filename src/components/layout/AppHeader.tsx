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
 * Role-aware primary nav — short labels, no duplicate office tools in the global bar.
 * Principals: Home + Office entry; roster/billing/ops live under Principal office.
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
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-50 border-b border-chrome-border bg-chrome/95 text-chrome-foreground backdrop-blur-xl pt-safe">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6">
        <Link href="/dashboard" className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-chrome-active text-sm font-bold text-primary-foreground shadow-sm">
            B
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight">{schoolShortName}</p>
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-chrome-muted">
              Beacon
            </p>
          </div>
        </Link>

        <nav
          className="hidden min-w-0 flex-1 items-center gap-0.5 overflow-x-auto md:flex [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                  'shrink-0 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition whitespace-nowrap',
                  active
                    ? 'bg-chrome-active text-primary-foreground'
                    : 'text-chrome-muted hover:bg-chrome-hover hover:text-chrome-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {profile ? (
            <div className="hidden items-center gap-2 rounded-full border border-chrome-border bg-chrome-elevated/60 py-1 pl-2.5 pr-1 sm:flex">
              <div className="min-w-0 text-right">
                <p className="max-w-[9rem] truncate text-xs font-semibold leading-none lg:max-w-[12rem]">
                  {displayName}
                </p>
                {roleText ? (
                  <p className="mt-0.5 text-[10px] font-medium text-chrome-muted">{roleText}</p>
                ) : null}
              </div>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-chrome-active/90 text-[11px] font-bold text-primary-foreground"
                aria-hidden
              >
                {initial}
              </span>
            </div>
          ) : null}
          {profile ? (
            <Link
              href="/settings#skins"
              className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-chrome-muted transition hover:bg-chrome-hover hover:text-chrome-foreground"
            >
              Skin
            </Link>
          ) : null}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-lg border border-chrome-border bg-chrome-elevated/50 px-2.5 py-1.5 text-xs font-medium text-chrome-foreground transition hover:bg-chrome-hover"
            >
              Sign out
            </button>
          </form>
        </div>
      </div>

      {/* Mobile nav rail */}
      <nav
        className="flex gap-0.5 overflow-x-auto border-t border-chrome-border px-2 py-1.5 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
                'shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition whitespace-nowrap',
                active
                  ? 'bg-chrome-active text-primary-foreground'
                  : 'text-chrome-muted hover:bg-chrome-hover hover:text-chrome-foreground'
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

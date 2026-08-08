'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { logout } from '@/app/actions/auth'
import { resolveActiveNavHref } from '@/lib/nav-active'
import { canAccessEmailOutbox, isSchoolStaff, roleLabel } from '@/lib/roles'
import type { Profile } from '@/lib/types'
import { cn } from '@/lib/utils'
import { NavigationFeedback } from './NavigationFeedback'

type NavItem = { href: string; label: string }

export function buildStaffNavGroups(role: Profile['role'] | null): {
  primary: NavItem[]
  more: NavItem[]
} {
  const staffComms = canAccessEmailOutbox(role)
  return {
    primary: [
      { href: '/dashboard', label: 'Home' },
      { href: '/teacher/classroom', label: 'Classroom' },
      { href: '/teacher/quick', label: 'Quick' },
      { href: '/announcements', label: 'News' },
      { href: '/settings', label: 'Settings' },
    ],
    more: [
      { href: '/teacher/lessons', label: 'Lessons' },
      { href: '/teacher/calendar', label: 'Calendar' },
      { href: '/teacher/printables', label: 'Printables' },
      { href: '/teacher/scan', label: 'Scan' },
      { href: '/craft', label: 'Craft' },
      ...(staffComms ? [{ href: '/admin/emails', label: 'Comms' }] : []),
      { href: '/school', label: 'School site' },
    ],
  }
}

/**
 * Role-aware primary nav — short labels, no duplicate office tools in the global bar.
 * Teachers: primary bar + More overflow for secondary tools.
 */
export function buildNav(role: Profile['role'] | null): NavItem[] {
  const isPrincipal = role === 'principal' || role === 'admin'
  const staffComms = canAccessEmailOutbox(role)

  if (isPrincipal) {
    if (role === 'admin') {
      return [
        { href: '/principal', label: 'Home' },
        { href: '/announcements', label: 'News' },
        ...(staffComms ? [{ href: '/admin/emails', label: 'Comms' }] : []),
        { href: '/settings', label: 'Settings' },
        { href: '/school', label: 'School site' },
      ]
    }
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
    const { primary, more } = buildStaffNavGroups(role)
    return [...primary, ...more]
  }

  return [
    { href: '/dashboard', label: 'Home' },
    { href: '/announcements', label: 'News' },
    { href: '/settings', label: 'Settings' },
    { href: '/school', label: 'School site' },
    { href: '/about', label: 'About' },
  ]
}

function NavLink({
  item,
  active,
  className,
}: {
  item: NavItem
  active: boolean
  className?: string
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'shrink-0 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition whitespace-nowrap',
        active
          ? 'bg-chrome-active text-chrome-foreground'
          : 'text-chrome-muted hover:bg-chrome-hover hover:text-chrome-foreground',
        className
      )}
    >
      {item.label}
    </Link>
  )
}

function MoreMenu({
  items,
  activeHref,
}: {
  items: NavItem[]
  activeHref: string | null
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const disclosureId = useId()
  const moreActive = items.some((i) => i.href === activeHref)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        ref={buttonRef}
        aria-expanded={open}
        aria-controls={open ? disclosureId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition whitespace-nowrap',
          moreActive || open
            ? 'bg-chrome-active text-chrome-foreground'
            : 'text-chrome-muted hover:bg-chrome-hover hover:text-chrome-foreground'
        )}
      >
        More
        <ChevronDown className={cn('h-3.5 w-3.5 transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <nav
          id={disclosureId}
          aria-label="More links"
          className="absolute right-0 top-full z-[60] mt-1 min-w-[10.5rem] rounded-xl border border-chrome-border bg-chrome-elevated py-1 shadow-lg"
        >
          {items.map((item) => {
            const active = item.href === activeHref
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block px-3 py-2 text-sm font-medium transition',
                  active
                    ? 'bg-chrome-active/20 text-chrome-foreground'
                    : 'text-chrome-muted hover:bg-chrome-hover hover:text-chrome-foreground'
                )}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      ) : null}
    </div>
  )
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
  // Teachers (and non-leadership staff) get a slim bar + More; principals keep Office nav.
  const staffGroups =
    role === 'teacher' || role === 'staff' ? buildStaffNavGroups(role) : null
  const nav = buildNav(role)
  const primary = staffGroups?.primary ?? nav
  const more = staffGroups?.more ?? []
  const activeHref = resolveActiveNavHref(
    pathname,
    nav.map((item) => item.href)
  )
  const displayName = profile?.full_name?.trim() || profile?.email || 'Account'
  const roleText = roleLabel(role)
  const initial = displayName.charAt(0).toUpperCase()

  // Mobile: primary rail + More overflow (same as desktop — avoid 12-tab scroll)
  const mobilePrimary = staffGroups?.primary ?? nav
  const mobileMore = staffGroups?.more ?? []

  return (
    <header className="sticky top-0 z-50 border-b border-chrome-border bg-chrome/95 text-chrome-foreground backdrop-blur-xl pt-safe">
      <NavigationFeedback />
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-6">
        <Link
          href={role === 'admin' ? '/principal' : '/dashboard'}
          className="flex min-w-0 shrink-0 items-center gap-2.5"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-chrome-border bg-chrome-elevated text-sm font-semibold text-chrome-foreground">
            B
          </span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium tracking-tight">{schoolShortName}</p>
            <p className="text-[10px] text-chrome-muted">Beacon</p>
          </div>
        </Link>

        <div className="hidden min-w-0 flex-1 items-center gap-0.5 md:flex">
          <nav
            className="min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Main navigation"
          >
            {primary.map((item) => (
              <NavLink key={item.href} item={item} active={item.href === activeHref} />
            ))}
          </nav>
          {more.length > 0 ? <MoreMenu items={more} activeHref={activeHref} /> : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          {profile ? (
            <div className="hidden items-center gap-2 rounded-md border border-chrome-border bg-chrome-elevated/60 py-1 pl-2.5 pr-1 sm:flex">
              <div className="min-w-0 text-right">
                <p className="max-w-[9rem] truncate text-xs font-medium leading-none lg:max-w-[12rem]">
                  {displayName}
                </p>
                {roleText ? (
                  <p className="mt-0.5 text-[10px] text-chrome-muted">{roleText}</p>
                ) : null}
              </div>
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-chrome-border bg-chrome-hover text-[11px] font-medium text-chrome-foreground"
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

      <div className="flex items-center border-t border-chrome-border md:hidden">
        <nav
          className="nav-scroll-mask min-w-0 flex-1 items-center gap-0.5 overflow-x-auto px-2 py-1.5 pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Main navigation"
        >
          {mobilePrimary.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={item.href === activeHref}
              className="text-xs"
            />
          ))}
        </nav>
        {mobileMore.length > 0 ? (
          <div className="shrink-0 py-1.5 pr-[max(0.5rem,env(safe-area-inset-right))]">
            <MoreMenu items={mobileMore} activeHref={activeHref} />
          </div>
        ) : null}
      </div>
    </header>
  )
}

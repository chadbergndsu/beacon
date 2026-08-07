'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const groups: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: 'Lead',
    links: [
      { href: '/principal', label: 'Overview' },
      { href: '/principal/roster', label: 'Roster' },
      { href: '/principal/approvals', label: 'Approvals' },
      { href: '/principal/release', label: 'Go-live' },
    ],
  },
  {
    label: 'Money',
    links: [
      { href: '/principal/payments', label: 'Payments' },
      { href: '/principal/billing', label: 'Tuition' },
      { href: '/principal/invoices', label: 'Invoices' },
    ],
  },
  {
    label: 'Campus',
    links: [
      { href: '/craft', label: 'Craft' },
      { href: '/principal/badges', label: 'Badges' },
      { href: '/principal/cameras', label: 'Cameras' },
      { href: '/principal/videos', label: 'Videos' },
      { href: '/principal/pulse', label: 'Pulse' },
    ],
  },
  {
    label: 'More',
    links: [
      { href: '/admin/emails', label: 'Comms' },
      { href: '/announcements/new', label: 'News post' },
      { href: '/principal/feedback', label: 'Feedback' },
      { href: '/principal/break', label: 'Break' },
    ],
  },
]

export function PrincipalNav({ officeAdmin = false }: { officeAdmin?: boolean }) {
  const pathname = usePathname()
  const navGroups = groups.map((group) => {
    if (group.label === 'Lead' && officeAdmin) {
      return {
        ...group,
        links: [
          ...group.links.slice(0, 2),
          { href: '/admin/emails', label: 'Comms' },
          ...group.links.slice(2),
        ],
      }
    }
    if (group.label === 'More') {
      return {
        ...group,
        links: group.links.filter((l) => {
          if (officeAdmin) {
            return l.href !== '/admin/emails'
          }
          return l.href !== '/admin/emails' && l.href !== '/announcements/new'
        }),
      }
    }
    return group
  })

  return (
    <nav className="space-y-3" aria-label={officeAdmin ? 'School office' : 'Principal office'}>
      {navGroups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <p className="w-16 shrink-0 text-[11px] font-semibold text-foreground/75 sm:w-14 sm:text-[10px] sm:font-medium sm:text-muted-foreground">
            {group.label}
          </p>
          <div className="nav-scroll-mask mobile-scroll-x gap-1 sm:flex-wrap sm:overflow-visible sm:pl-0 sm:pr-0">
            {group.links.map((l) => {
              const active =
                l.href === '/principal'
                  ? pathname === '/principal'
                  : pathname.startsWith(l.href)
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    'shrink-0 whitespace-nowrap rounded-md border px-2.5 py-1.5 text-[13px] font-medium transition',
                    active
                      ? 'border-border bg-card text-foreground shadow-sm'
                      : 'border-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground'
                  )}
                >
                  {l.label}
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

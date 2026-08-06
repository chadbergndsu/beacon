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
      { href: '/principal/badges', label: 'Badges' },
      { href: '/principal/cameras', label: 'Cameras' },
      { href: '/principal/videos', label: 'Videos' },
      { href: '/principal/pulse', label: 'Pulse' },
    ],
  },
  {
    label: 'More',
    links: [
      { href: '/principal/feedback', label: 'Feedback' },
      { href: '/principal/break', label: 'Break' },
    ],
  },
]

export function PrincipalNav() {
  const pathname = usePathname()

  return (
    <nav className="space-y-3" aria-label="Principal office">
      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
          <p className="w-14 shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {group.label}
          </p>
          <div className="mobile-scroll-x gap-1.5 sm:flex-wrap sm:overflow-visible">
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
                    'shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition',
                    active
                      ? 'bg-navy text-navy-foreground shadow-sm'
                      : 'bg-muted/60 text-foreground hover:bg-muted'
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

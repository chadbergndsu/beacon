'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/principal', label: 'Overview' },
  { href: '/principal/roster', label: 'Roster' },
  { href: '/principal/approvals', label: 'Approvals & history' },
  { href: '/principal/badges', label: 'Badges & kiosk' },
  { href: '/principal/release', label: 'Go-live' },
  { href: '/principal/feedback', label: 'Pilot feedback' },
  { href: '/principal/payments', label: 'Payments & QuickBooks' },
  { href: '/principal/billing', label: 'Tuition products' },
  { href: '/principal/invoices', label: 'Invoices & payments' },
  { href: '/principal/videos', label: 'Videos' },
  { href: '/principal/cameras', label: 'Cameras' },
  { href: '/principal/pulse', label: 'Beacon Pulse' },
  { href: '/principal/break', label: 'Coffee break' },
]

export function PrincipalNav() {
  const pathname = usePathname()

  return (
    <nav
      className="mobile-scroll-x gap-2 pb-0.5 sm:flex sm:flex-wrap sm:overflow-visible"
      aria-label="Principal office"
    >
      {links.map((l) => {
        const active =
          l.href === '/principal' ? pathname === '/principal' : pathname.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'shrink-0 whitespace-nowrap rounded-xl border px-3.5 py-2 text-sm font-semibold transition',
              active
                ? 'border-navy bg-navy text-white shadow-sm'
                : 'border-border bg-card text-foreground hover:border-sky-300 hover:bg-sky-50/60'
            )}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}

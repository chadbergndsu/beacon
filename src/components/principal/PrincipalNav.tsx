'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/principal', label: 'Overview' },
  { href: '/principal/release', label: 'Go-live' },
  { href: '/principal/payments', label: 'Payments & QuickBooks' },
  { href: '/principal/billing', label: 'Tuition products' },
  { href: '/principal/invoices', label: 'Invoices & payments' },
  { href: '/principal/videos', label: 'Videos' },
  { href: '/principal/pulse', label: 'Beacon Pulse' },
  { href: '/principal/break', label: 'Coffee break' },
]

export function PrincipalNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2">
      {links.map((l) => {
        const active =
          l.href === '/principal' ? pathname === '/principal' : pathname.startsWith(l.href)
        return (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              'rounded-xl px-3.5 py-2 text-sm font-semibold transition border',
              active
                ? 'bg-navy text-white border-navy shadow-sm'
                : 'bg-card text-foreground border-border hover:border-sky-300 hover:bg-sky-50/60'
            )}
          >
            {l.label}
          </Link>
        )
      })}
    </nav>
  )
}

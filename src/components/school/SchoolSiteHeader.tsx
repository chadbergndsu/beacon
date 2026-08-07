'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { beaconCraftTourUrl } from '@/lib/beaconcraft-url'
import { CraftHref } from '@/components/craft/CraftHref'
import { buttonClassName } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const anchors = [
  { href: '#about', label: 'About' },
  { href: '#academics', label: 'Academics' },
  { href: '#tour', label: 'Campus tour' },
  { href: '#families', label: 'Families' },
  { href: '#contact', label: 'Contact' },
]

function craftTourUrl(): string {
  return beaconCraftTourUrl()
}

export function SchoolSiteHeader({
  schoolName,
  websiteUrl,
  schoolHref = '/school',
  beaconHref = '/about',
  loginHref = '/login',
}: {
  schoolName: string
  websiteUrl?: string | null
  schoolHref?: string
  beaconHref?: string
  loginHref?: string
}) {
  const [open, setOpen] = useState(false)
  const tourUrl = craftTourUrl()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl pt-safe">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <Link href={schoolHref} className="block truncate text-sm font-medium sm:text-base">
            {schoolName}
          </Link>
          <Link
            href={beaconHref}
            className="inline-flex min-h-11 items-center rounded-md pr-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground hover:text-primary hover:underline"
          >
            Powered by Beacon
          </Link>
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="School site">
          {anchors.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {a.label}
            </a>
          ))}
          <Link
            href={beaconHref}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            About Beacon
          </Link>
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-3 py-2 text-sm font-medium text-primary hover:bg-muted"
            >
              Official site
            </a>
          )}
          <CraftHref
            href={tourUrl}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Campus tour
          </CraftHref>
          <Link href={loginHref} className={cn(buttonClassName('primary', 'sm'), 'ml-1')}>
            Sign in
          </Link>
        </nav>

        <button
          type="button"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border p-2 md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="school-mobile-navigation"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        id="school-mobile-navigation"
        className={cn(
          'border-t border-border bg-card px-4 pb-4 pb-safe md:hidden',
          open ? 'block' : 'hidden'
        )}
      >
        <div className="flex flex-col gap-1 pt-2">
          {anchors.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              {a.label}
            </a>
          ))}
          <Link
            href={beaconHref}
            className="flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium"
            onClick={() => setOpen(false)}
          >
            About Beacon
          </Link>
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium text-primary"
            >
              Official website
            </a>
          )}
          <CraftHref
            href={tourUrl}
            className="flex min-h-11 items-center rounded-md px-3 py-2.5 text-sm font-medium"
            onClick={() => setOpen(false)}
          >
            Campus tour
          </CraftHref>
          <Link
            href={loginHref}
            className={cn(buttonClassName('primary', 'sm'), 'mt-1 min-h-11 text-center')}
            onClick={() => setOpen(false)}
          >
            Sign in to Beacon
          </Link>
        </div>
      </div>
    </header>
  )
}

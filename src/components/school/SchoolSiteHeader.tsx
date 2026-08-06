'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const anchors = [
  { href: '#about', label: 'About' },
  { href: '#academics', label: 'Academics' },
  { href: '#tour', label: 'Campus tour' },
  { href: '#families', label: 'Families' },
  { href: '#contact', label: 'Contact' },
]

function craftTourUrl(): string {
  const raw =
    typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_BEACONCRAFT_URL?.trim()
      : ''
  const base = (raw || 'http://localhost:3001').replace(/\/$/, '')
  return `${base}/?tour=1`
}

export function SchoolSiteHeader({
  schoolName,
  websiteUrl,
}: {
  schoolName: string
  websiteUrl?: string | null
}) {
  const [open, setOpen] = useState(false)
  const tourUrl = craftTourUrl()

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-card/90 backdrop-blur-xl pt-safe">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/school" className="min-w-0 font-bold text-navy dark:text-sky-50">
          <span className="block truncate text-sm sm:text-base">{schoolName}</span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-sky-700">
            Powered by Beacon
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="School site">
          {anchors.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {a.label}
            </a>
          ))}
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3 py-2 text-sm font-medium text-sky-700 hover:bg-sky-50"
            >
              Official site
            </a>
          )}
          <a
            href={tourUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Campus tour
          </a>
          <Link
            href="/login"
            className="ml-1 rounded-xl bg-navy px-3.5 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Sign in
          </Link>
        </nav>

        <button
          type="button"
          className="md:hidden rounded-xl border border-border p-2"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <div
        className={cn(
          'md:hidden border-t border-border bg-card px-4 pb-4',
          open ? 'block' : 'hidden'
        )}
      >
        <div className="flex flex-col gap-1 pt-2">
          {anchors.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="rounded-lg px-3 py-2.5 text-sm font-medium"
              onClick={() => setOpen(false)}
            >
              {a.label}
            </a>
          ))}
          {websiteUrl && (
            <a
              href={websiteUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-sky-700"
            >
              Official website
            </a>
          )}
          <a
            href={tourUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-2.5 text-sm font-medium"
            onClick={() => setOpen(false)}
          >
            Campus tour
          </a>
          <Link
            href="/login"
            className="mt-1 rounded-xl bg-navy px-3 py-2.5 text-center text-sm font-semibold text-white"
            onClick={() => setOpen(false)}
          >
            Sign in to Beacon
          </Link>
        </div>
      </div>
    </header>
  )
}

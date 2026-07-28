'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const OFFICIAL = 'https://lcadawsonville.com'

const links = [
  { href: '#about', label: 'About' },
  { href: '#tuition', label: 'Tuition' },
  { href: '#enroll', label: 'Enroll' },
  { href: '#contact', label: 'Contact' },
]

export function SchoolSiteHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-navy/95 text-navy-foreground backdrop-blur-md pt-safe">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-sm font-black text-white shadow-lg shadow-sky-500/25">
            L
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-bold leading-none tracking-tight">
              Lighthouse Christian Academy
            </p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.14em] text-sky-300/90">
              Dawsonville · K4–12
            </p>
          </div>
        </div>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 text-sm lg:flex" aria-label="School site">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10"
            >
              {l.label}
            </a>
          ))}
          <a
            href={OFFICIAL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-slate-200 hover:bg-white/10"
          >
            Official site <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <Link
            href="/login"
            className="ml-1 rounded-xl bg-sky-500 px-3.5 py-2 font-semibold text-white hover:bg-sky-400"
          >
            Beacon portal
          </Link>
        </nav>

        {/* Phone actions */}
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <Link
            href="/login"
            className="rounded-xl bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400"
          >
            Portal
          </Link>
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((v) => !v)}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          'border-t border-white/10 bg-navy lg:hidden',
          open ? 'block' : 'hidden'
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3 sm:px-6" aria-label="Mobile">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-xl px-3 py-3 text-base font-medium text-slate-100 hover:bg-white/10"
            >
              {l.label}
            </a>
          ))}
          <a
            href={OFFICIAL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl px-3 py-3 text-base font-medium text-slate-100 hover:bg-white/10"
          >
            Official site <ExternalLink className="h-4 w-4" />
          </a>
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="mt-1 rounded-xl bg-sky-500 px-3 py-3 text-center text-base font-semibold text-white"
          >
            Beacon portal
          </Link>
        </nav>
      </div>
    </header>
  )
}

'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'grades', label: 'Gradebook', href: (id: string) => `/classes/${id}` },
  {
    id: 'attendance',
    label: 'Attendance',
    href: (id: string) => `/classes/${id}?tab=attendance`,
  },
  { id: 'lessons', label: 'Lessons', href: (id: string) => `/classes/${id}?tab=lessons` },
  { id: 'pulse', label: 'Pulse', href: (id: string) => `/classes/${id}?tab=pulse` },
  {
    id: 'setup',
    label: 'Setup',
    href: (id: string) => `/classes/${id}?tab=setup`,
  },
] as const

export function ClassTabs({ classId }: { classId: string }) {
  const searchParams = useSearchParams()
  const raw = searchParams.get('tab')
  const tab =
    raw === 'setup' || raw === 'lessons' || raw === 'pulse' || raw === 'attendance'
      ? raw
      : 'grades'

  return (
    <nav className="mobile-scroll-x gap-1.5 pb-0.5" aria-label="Class modules">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href(classId)}
          className={cn(
            'shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition',
            tab === t.id
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted/70 text-foreground hover:bg-muted'
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

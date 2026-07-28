'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { id: 'grades', label: 'Grade entry', href: (id: string) => `/classes/${id}` },
  {
    id: 'attendance',
    label: 'Attendance',
    href: (id: string) => `/classes/${id}?tab=attendance`,
  },
  { id: 'lessons', label: 'Lesson plans', href: (id: string) => `/classes/${id}?tab=lessons` },
  { id: 'pulse', label: 'Beacon Pulse', href: (id: string) => `/classes/${id}?tab=pulse` },
  { id: 'setup', label: 'Class setup', href: (id: string) => `/classes/${id}?tab=setup` },
] as const

export function ClassTabs({ classId }: { classId: string }) {
  const searchParams = useSearchParams()
  const raw = searchParams.get('tab')
  const tab =
    raw === 'setup' || raw === 'lessons' || raw === 'pulse' || raw === 'attendance'
      ? raw
      : 'grades'

  return (
    <nav className="mobile-scroll-x gap-2 sm:flex-wrap" aria-label="Class modules">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href(classId)}
          className={cn(
            'shrink-0 rounded-xl border px-3.5 py-2.5 text-sm font-semibold shadow-sm transition-all sm:px-4',
            tab === t.id
              ? t.id === 'pulse'
                ? 'border-violet-600 bg-violet-600 text-white shadow-violet-500/20'
                : 'border-primary bg-primary text-primary-foreground shadow-sky-500/20'
              : 'border-border bg-card text-foreground hover:border-sky-300 hover:bg-sky-50/50'
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

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
    <nav className="flex flex-wrap gap-2" aria-label="Class modules">
      {tabs.map((t) => (
        <Link
          key={t.id}
          href={t.href(classId)}
          className={cn(
            'rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border shadow-sm',
            tab === t.id
              ? t.id === 'pulse'
                ? 'bg-violet-600 text-white border-violet-600 shadow-violet-500/20'
                : 'bg-primary text-primary-foreground border-primary shadow-sky-500/20'
              : 'bg-card text-foreground border-border hover:border-sky-300 hover:bg-sky-50/50'
          )}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  )
}

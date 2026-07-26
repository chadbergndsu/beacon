'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

export function ClassTabs({ classId }: { classId: string }) {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') === 'setup' ? 'setup' : 'grades'

  const base =
    'rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border shadow-sm'
  const active = 'bg-primary text-primary-foreground border-primary shadow-sky-500/20'
  const idle = 'bg-card text-foreground border-border hover:border-sky-300 hover:bg-sky-50/50'

  return (
    <nav className="flex gap-2">
      <Link
        href={`/classes/${classId}`}
        className={`${base} ${tab === 'grades' ? active : idle}`}
      >
        Grade entry
      </Link>
      <Link
        href={`/classes/${classId}?tab=setup`}
        className={`${base} ${tab === 'setup' ? active : idle}`}
      >
        Class setup
      </Link>
    </nav>
  )
}

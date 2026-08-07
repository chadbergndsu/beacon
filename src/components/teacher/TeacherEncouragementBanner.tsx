'use client'

import { useCallback, useState } from 'react'
import { RefreshCw, Sparkles } from 'lucide-react'
import {
  randomTeacherEncouragement,
  type TeacherEncouragement,
} from '@/lib/teacher/encouragement'
import { cn } from '@/lib/utils'

export function TeacherEncouragementBanner({
  initial,
  initialIndex,
  className,
}: {
  initial: TeacherEncouragement
  initialIndex: number
  className?: string
}) {
  const [current, setCurrent] = useState(initial)
  const [index, setIndex] = useState(initialIndex)
  const [spinning, setSpinning] = useState(false)

  const shuffle = useCallback(() => {
    setSpinning(true)
    const next = randomTeacherEncouragement(index)
    setCurrent(next.item)
    setIndex(next.index)
    window.setTimeout(() => setSpinning(false), 400)
  }, [index])

  const label = current.kind === 'verse' ? 'Scripture' : 'Encouragement'

  return (
    <div
      className={cn(
        'overflow-hidden rounded-lg border border-amber-200/80 bg-gradient-to-r from-amber-50/90 via-card to-sky-50/60',
        className
      )}
      aria-live="polite"
    >
      <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-start sm:gap-4 sm:px-5">
        <div className="flex min-w-0 flex-1 gap-3">
          <span
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-amber-200/80 bg-amber-100/80 text-amber-900"
            aria-hidden
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-amber-900/80">
              For you · {label}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-foreground/90 sm:text-sm">
              {current.kind === 'verse' ? (
                <>
                  <span className="font-medium">&ldquo;{current.text}&rdquo;</span>
                  {current.source ? (
                    <span className="mt-1 block text-[12px] font-semibold text-muted-foreground">
                      — {current.source}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="font-medium">{current.text}</span>
              )}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              You matter here. Thank you for the work you do with students every day.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={shuffle}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 self-start rounded-md border border-amber-200/80 bg-white/70 px-3 py-2 text-[12px] font-semibold text-amber-950 transition hover:border-amber-300 hover:bg-white"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', spinning && 'animate-spin')} aria-hidden />
          New encouragement
        </button>
      </div>
    </div>
  )
}

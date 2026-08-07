'use client'

import type { LeadershipQuote } from '@/lib/principal/leadership-quotes'

export function LeadershipQuoteTicker({ quote }: { quote: LeadershipQuote }) {
  const line = `"${quote.text}" — ${quote.author}`

  return (
    <div
      className="flex min-w-0 items-center gap-3 overflow-hidden rounded-md border border-primary/15 bg-primary/5 px-3 py-2"
      aria-label={`${quote.label}: ${quote.text} by ${quote.author}`}
    >
      <p className="hidden shrink-0 text-[10px] font-bold uppercase tracking-[0.12em] text-primary sm:block">
        {quote.label}
      </p>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="leadership-quote-track flex w-max items-center gap-8 whitespace-nowrap text-[13px] text-foreground/90">
          <span className="font-medium">{line}</span>
          <span className="font-medium text-muted-foreground" aria-hidden>
            {line}
          </span>
        </div>
      </div>
    </div>
  )
}

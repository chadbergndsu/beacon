'use client'

import type { DeskIntention } from '@/lib/comms/desk'

export function DeskIntentions({
  intentions,
  onPick,
}: {
  intentions: DeskIntention[]
  onPick: (intention: DeskIntention) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between gap-2">
        <div>
          <h2 className="text-[13px] font-medium text-foreground">Start with intention</h2>
          <p className="text-xs text-muted-foreground">
            One-tap starters — edit the note, then send. Delivery stays in the outbox.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {intentions.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onPick(item)}
            className="group animate-beacon-in rounded-xl border border-border/80 bg-card px-3.5 py-3 text-left transition-colors hover:border-primary/35 hover:bg-primary/[0.03]"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <p className="text-sm font-semibold text-foreground group-hover:text-primary">
              {item.label}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{item.blurb}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

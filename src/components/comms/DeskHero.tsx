'use client'

import Link from 'next/link'
import type { DeskBrief } from '@/lib/comms/desk'
import { SimulateReplyButton } from '@/components/comms/SimulateReplyButton'
import { buttonClassName } from '@/components/ui/button'

/**
 * First viewport of Family Desk — one composition: brand signal, pulse, one CTA group.
 */
export function DeskHero({
  schoolName,
  brief,
  inboundOn,
  canSimulate,
}: {
  schoolName: string
  brief: DeskBrief
  inboundOn: boolean
  canSimulate: boolean
}) {
  const hasWork = brief.unreadReplies > 0 || brief.failedLast24h > 0

  return (
    <section className="desk-hero relative overflow-hidden rounded-2xl border border-border/80">
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(120% 80% at 0% 0%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 55%), radial-gradient(90% 70% at 100% 10%, color-mix(in oklab, var(--navy) 18%, transparent), transparent 50%), linear-gradient(165deg, color-mix(in oklab, var(--navy) 4%, var(--background)), var(--card))',
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full opacity-[0.12]"
        style={{ background: 'var(--navy)' }}
        aria-hidden
      />

      <div className="relative animate-beacon-in px-5 py-7 sm:px-8 sm:py-9">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          Family Desk
        </p>
        <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {schoolName}
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          {hasWork
            ? 'Families wrote back. Handle replies first — every send and reply stays logged.'
            : 'The daily home for notes to families. Compose once, know it landed, read every reply.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-6">
          <PulseStat
            label="Unread replies"
            value={brief.unreadReplies}
            hot={brief.unreadReplies > 0}
          />
          <PulseStat label="Sent · 24h" value={brief.sentLast24h} />
          <PulseStat
            label="Failed · 24h"
            value={brief.failedLast24h}
            hot={brief.failedLast24h > 0}
          />
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-2">
          <a href="#desk-compose" className={buttonClassName('primary', 'md')}>
            Write a note
          </a>
          <a href="#desk-inbox" className={buttonClassName('outline', 'md')}>
            {brief.unreadReplies > 0
              ? `Open replies (${brief.unreadReplies})`
              : 'Family replies'}
          </a>
          <span
            className={
              inboundOn
                ? 'rounded-md border border-emerald-200/80 bg-success-soft px-2 py-1 text-[11px] font-medium text-success'
                : 'rounded-md border border-border bg-muted/60 px-2 py-1 text-[11px] font-medium text-muted-foreground'
            }
          >
            {inboundOn ? 'Reply capture on' : 'Reply capture optional'}
          </span>
        </div>

        {canSimulate ? (
          <div className="mt-4 max-w-md border-t border-border/60 pt-4">
            <p className="mb-2 text-[11px] text-muted-foreground">
              Smoke-test Inbox without MX — same ingest path as live parent replies.
            </p>
            <SimulateReplyButton />
          </div>
        ) : null}

        <p className="mt-5 text-[11px] text-muted-foreground">
          Parents see the same thread at{' '}
          <Link href="/messages" className="font-medium text-primary hover:underline">
            /messages
          </Link>
          .
        </p>
      </div>
    </section>
  )
}

function PulseStat({
  label,
  value,
  hot,
}: {
  label: string
  value: number
  hot?: boolean
}) {
  return (
    <div className="min-w-[5.5rem]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p
        className={
          hot
            ? 'mt-0.5 text-3xl font-semibold tabular-nums text-warning'
            : 'mt-0.5 text-3xl font-semibold tabular-nums text-foreground'
        }
      >
        {value}
      </p>
    </div>
  )
}

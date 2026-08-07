'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FUN_FACTS } from '@/lib/marketing/fun-facts'
import { cn } from '@/lib/utils'

type TabId = 'case' | 'fun'

/**
 * Landing tabs: serious FACTS case vs “Fun Facts” mockery (true digs).
 */
export function FactsLandingTabs() {
  const [tab, setTab] = useState<TabId>('fun')

  return (
    <section id="fun-facts" className="border-y border-border bg-navy text-navy-foreground">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div
          role="tablist"
          aria-label="FACTS messaging"
          className="flex flex-wrap gap-2 border-b border-white/15 pb-4"
        >
          <TabButton active={tab === 'case'} onClick={() => setTab('case')} id="tab-case">
            The case
          </TabButton>
          <TabButton active={tab === 'fun'} onClick={() => setTab('fun')} id="tab-fun">
            Fun Facts
          </TabButton>
        </div>

        {tab === 'case' ? (
          <div role="tabpanel" aria-labelledby="tab-case" className="animate-beacon-in pt-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300/90">
              Going after FACTS
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              They won on tuition scale. We’re winning on whether families open anything.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-sky-100/85 sm:text-[15px]">
              FACTS claims 15,000+ schools. Fine. FACTS is Nelnet (NYSE: NNI) — a commercial brand
              that sells into Christian schools, not a Christian ministry. Independent schools still
              tell us the same story: two portals, a tired family app, and an office that can’t prove
              a message landed. Beacon is ministry-stewarded and communications-first.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/vs/facts"
                className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-navy transition hover:bg-sky-50"
              >
                Full Beacon vs FACTS compare
              </Link>
              <a
                href="#inquiry"
                className="inline-flex h-11 items-center justify-center rounded-md border border-white/30 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                We’re on FACTS — talk to us
              </a>
            </div>
          </div>
        ) : (
          <div role="tabpanel" aria-labelledby="tab-fun" className="animate-beacon-in pt-10">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-sky-300/90">
              Fun Facts
            </p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Corporate America is taking advantage of Christian schools — that’s the FACTS.
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-sky-100/80">
              True digs. Not conspiracy. Just ownership, incentives, and a portal families ignore.
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {FUN_FACTS.map((f) => (
                <li key={f.lead} className="border-t border-white/15 pt-5">
                  <p className="text-base font-semibold tracking-tight text-white">{f.lead}</p>
                  <p className="mt-2 text-sm leading-relaxed text-sky-100/80">{f.body}</p>
                </li>
              ))}
            </ul>
            <p className="mt-10 text-sm text-sky-100/75">
              Want the straight compare?{' '}
              <Link href="/vs/facts" className="font-semibold text-white underline-offset-4 hover:underline">
                Beacon vs FACTS →
              </Link>
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function TabButton({
  active,
  onClick,
  id,
  children,
}: {
  active: boolean
  onClick: () => void
  id: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      role="tab"
      id={id}
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 items-center rounded-md px-4 text-sm font-semibold transition',
        active
          ? 'bg-white text-navy'
          : 'bg-white/5 text-sky-100/85 hover:bg-white/10 hover:text-white'
      )}
    >
      {children}
    </button>
  )
}

import Link from 'next/link'
import type { Metadata } from 'next'
import { SchoolInquiryForm } from '@/components/marketing/SchoolInquiryForm'
import { JsonLd } from '@/components/seo/JsonLd'
import { buttonClassName } from '@/components/ui/button'
import {
  BEACON_ATTACK_LINES,
  COMPARE_ROWS,
  FACTS_FAQS,
  FACTS_ORG,
  FACTS_SCALE,
  FACTS_SEO_KEYWORDS,
} from '@/lib/marketing/facts-compare'
import {
  breadcrumbJsonLd,
  faqPageJsonLd,
  factsCompareWebPageJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLdFactsAlt,
} from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'Beacon vs FACTS | FACTS Alternative for Christian Schools',
  description:
    'Is FACTS a Christian organization? No — it’s Nelnet (NYSE: NNI). Beacon is the ministry-stewarded FACTS & RenWeb alternative: Family Desk, Dinner Table Digests, logged parent replies — without the portal black hole.',
  alternates: { canonical: '/vs/facts' },
  openGraph: {
    title: 'Beacon vs FACTS — leave the portal black hole',
    description:
      'FACTS owns tuition scale. FACTS is not a Christian ministry. Beacon owns calm family communications for faith-based schools.',
    url: '/vs/facts',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Beacon vs FACTS | Christian school FACTS alternative',
    description:
      'Honest compare: Nelnet’s FACTS vs Beacon Family Desk. RenWeb alternative schools actually open.',
  },
  keywords: [...FACTS_SEO_KEYWORDS],
  robots: { index: true, follow: true },
}

export default function VsFactsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd
        data={[
          organizationJsonLd(),
          softwareApplicationJsonLdFactsAlt(),
          factsCompareWebPageJsonLd(),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Beacon vs FACTS', path: '/vs/facts' },
          ]),
          faqPageJsonLd(FACTS_FAQS),
        ]}
      />

      <header className="border-b border-border/80 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
              B
            </span>
            Beacon
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/vs/renweb" className="hidden text-navy-foreground/70 hover:text-white sm:inline">
              RenWeb alt
            </Link>
            <Link href="/#inquiry" className="text-navy-foreground/70 hover:text-white">
              Talk with us
            </Link>
            <Link href="/login" className={buttonClassName('primary', 'sm')}>
              Sign in
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          FACTS alternative · RenWeb alternative
        </p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Beacon vs FACTS — for Christian and independent schools
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          FACTS ({FACTS_ORG.parent}, {FACTS_ORG.ticker}) is the scale leader for private-school
          tuition — about <strong className="text-foreground">{FACTS_SCALE.schools} schools</strong>{' '}
          and <strong className="text-foreground">{FACTS_SCALE.families} families</strong> on their
          claim. Beacon is not trying to out-module them on aid and collections. We’re going after
          the wound schools feel every week:{' '}
          <em>families don’t open the portal, and the office can’t prove communications landed.</em>
        </p>

        <aside className="mt-8 rounded-2xl border border-warning/30 bg-warning-soft/40 px-5 py-4 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-warning">
            Straight answer
          </p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Is FACTS a Christian organization?
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground">{FACTS_ORG.blunt}</p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{FACTS_ORG.detail}</p>
        </aside>

        <ul className="mt-8 space-y-3 border-l-2 border-primary/40 pl-5">
          {BEACON_ATTACK_LINES.map((line) => (
            <li key={line} className="text-sm font-medium leading-relaxed text-foreground sm:text-[15px]">
              {line}
            </li>
          ))}
        </ul>

        <section className="mt-14">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Side-by-side: FACTS vs Beacon
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Honest edges — where FACTS still wins on tuition depth, and where Beacon takes the fight
            on family experience, ownership, and stewardship.
          </p>

          <div className="mt-6 overflow-x-auto rounded-2xl border border-border/80">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-navy text-navy-foreground">
                <tr>
                  <th className="px-4 py-3 font-semibold">Dimension</th>
                  <th className="px-4 py-3 font-semibold">FACTS (Nelnet)</th>
                  <th className="px-4 py-3 font-semibold">Beacon</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.dimension} className="border-t border-border align-top">
                    <td className="px-4 py-3.5 font-medium text-foreground">{row.dimension}</td>
                    <td
                      className={
                        row.edge === 'facts'
                          ? 'px-4 py-3.5 text-foreground'
                          : 'px-4 py-3.5 text-muted-foreground'
                      }
                    >
                      {row.facts}
                      {row.edge === 'facts' ? (
                        <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-warning">
                          FACTS edge
                        </span>
                      ) : null}
                    </td>
                    <td
                      className={
                        row.edge === 'beacon'
                          ? 'px-4 py-3.5 text-foreground'
                          : 'px-4 py-3.5 text-muted-foreground'
                      }
                    >
                      {row.beacon}
                      {row.edge === 'beacon' ? (
                        <span className="mt-1 block text-[11px] font-bold uppercase tracking-wider text-success">
                          Beacon edge
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{FACTS_SCALE.note}</p>
        </section>

        <section className="mt-14 border-t border-border pt-14">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            FACTS alternative FAQ
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Search intent we answer in plain English — including RenWeb and Christian-school buyers.
          </p>
          <dl className="mt-8 space-y-8">
            {FACTS_FAQS.map((faq) => (
              <div key={faq.question}>
                <dt className="text-base font-semibold text-foreground">{faq.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14 grid gap-10 border-t border-border pt-14 lg:grid-cols-2">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              Leaving FACTS or RenWeb? Start with the family layer
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Many Christian schools keep FACTS tuition for a season and still need a better family
              communications + academics home. Beacon pilots academics-first: Family Desk, Notes from
              school, Dinner Table Digests — then school-owned pay links when you’re ready. No
              BillerGenie. No “messages disappeared into the void.”
            </p>
            <p className="mt-4 text-sm text-muted-foreground">
              Also see{' '}
              <Link href="/vs/renweb" className="font-medium text-primary hover:underline">
                RenWeb alternative
              </Link>{' '}
              ·{' '}
              <Link href="/" className="font-medium text-primary hover:underline">
                product home
              </Link>
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              Switch conversation
            </p>
            <h3 className="mt-1 text-lg font-semibold text-foreground">We’re on FACTS — talk</h3>
            <p className="mt-1 mb-4 text-sm text-muted-foreground">
              Tell us you’re on FACTS / RenWeb. We’ll reply by email — no sales theater.
            </p>
            <SchoolInquiryForm compact />
          </div>
        </section>
      </main>
    </div>
  )
}

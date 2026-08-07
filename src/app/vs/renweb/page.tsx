import Link from 'next/link'
import type { Metadata } from 'next'
import { SchoolInquiryForm } from '@/components/marketing/SchoolInquiryForm'
import { JsonLd } from '@/components/seo/JsonLd'
import { buttonClassName } from '@/components/ui/button'
import { FACTS_ORG, FACTS_SEO_KEYWORDS } from '@/lib/marketing/facts-compare'
import {
  breadcrumbJsonLd,
  organizationJsonLd,
  softwareApplicationJsonLdFactsAlt,
} from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'RenWeb Alternative for Christian Schools | Beacon vs FACTS SIS',
  description:
    'Looking for a RenWeb alternative? RenWeb became FACTS SIS (Nelnet). Beacon is the communications-first alternative for Christian schools — Family Desk, Dinner Table Digests, logged parent replies.',
  alternates: { canonical: '/vs/renweb' },
  openGraph: {
    title: 'RenWeb alternative — Beacon for faith-based schools',
    description:
      'RenWeb is FACTS SIS now. Beacon replaces the portal black hole with Family Desk and Dinner Table Digests.',
    url: '/vs/renweb',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RenWeb alternative | Beacon',
    description: 'Leave RenWeb / FACTS portal fatigue. Ministry-stewarded school software.',
  },
  keywords: [
    'RenWeb alternative',
    'RenWeb vs Beacon',
    'replace RenWeb',
    'FACTS SIS alternative',
    ...FACTS_SEO_KEYWORDS.filter((k) => !k.toLowerCase().includes('renweb')),
  ],
  robots: { index: true, follow: true },
}

export default function VsRenwebPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd
        data={[
          organizationJsonLd(),
          softwareApplicationJsonLdFactsAlt(),
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'RenWeb alternative', path: '/vs/renweb' },
          ]),
          {
            '@context': 'https://schema.org',
            '@type': 'WebPage',
            name: 'RenWeb Alternative for Christian Schools',
            url: 'https://beacon.commoncentsip.com/vs/renweb',
            description:
              'RenWeb became FACTS SIS. Beacon is a RenWeb / FACTS alternative focused on family communications.',
          },
        ]}
      />

      <header className="border-b border-border/80 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
              B
            </span>
            Beacon
          </Link>
          <Link href="/login" className={buttonClassName('primary', 'sm')}>
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
          RenWeb alternative
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          RenWeb became FACTS. Families still need something they’ll open.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          If you’re searching for a <strong className="text-foreground">RenWeb alternative</strong>,
          you’re usually already on <strong className="text-foreground">FACTS SIS</strong> — RenWeb
          was absorbed into the FACTS product line under {FACTS_ORG.parent} ({FACTS_ORG.ticker}).
          Same commercial stack. Same portal fatigue for a lot of Christian schools.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {FACTS_ORG.blunt} Beacon is ministry-stewarded school software: Family Desk, Dinner Table
          Digests, and logged parent replies — a RenWeb / FACTS alternative that starts with
          communications, not another wall of modules.
        </p>

        <ul className="mt-8 space-y-2 text-sm text-foreground">
          <li>· Notes from school parents can answer</li>
          <li>· Dinner Table Digest instead of a portal of tables</li>
          <li>· Live vs log-only honesty on email and payments</li>
          <li>· School-owned data — keep FACTS tuition for a season if you need to</li>
        </ul>

        <p className="mt-8">
          <Link
            href="/vs/facts"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-95"
          >
            Full Beacon vs FACTS compare →
          </Link>
        </p>

        <section className="mt-14 rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-foreground">Leaving RenWeb / FACTS?</h2>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Tell us what hurts. We’ll reply by email.
          </p>
          <SchoolInquiryForm compact />
        </section>
      </main>
    </div>
  )
}

import Link from 'next/link'
import type { Metadata } from 'next'
import { Heart, School, Shield, Sparkles, HandHeart } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { SchoolInquiryForm } from '@/components/marketing/SchoolInquiryForm'
import { JsonLd } from '@/components/seo/JsonLd'
import { buttonClassName } from '@/components/ui/button'
import { loadSchoolBrand } from '@/lib/school-brand'
import { organizationJsonLd, softwareApplicationJsonLd } from '@/lib/seo/json-ld'

export const metadata: Metadata = {
  title: 'About Beacon',
  description:
    'Beacon is a ministry-stewarded FACTS alternative for Christian schools — Dinner Table Digests, Family Desk, grades, and honest tuition. Created by Common Cents IP.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Beacon — FACTS alternative, ministry-stewarded',
    description: 'The operating system for schools that outgrew portal chaos.',
    url: '/about',
  },
  keywords: [
    'About Beacon school software',
    'Common Cents IP',
    'Christian school software ministry',
    'FACTS alternative',
  ],
}

export default async function AboutPage() {
  const brand = await loadSchoolBrand(null)

  return (
    <div className="min-h-screen beacon-shell">
      <JsonLd data={[organizationJsonLd(), softwareApplicationJsonLd()]} />
      <header className="border-b border-border/80 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2.5 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
              B
            </span>
            Beacon
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/#inquiry" className="text-navy-foreground/70 hover:text-navy-foreground">
              Talk with us
            </Link>
            <Link
              href="/login"
              className="font-medium text-navy-foreground/70 transition hover:text-navy-foreground"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-2xl animate-beacon-in space-y-8 px-4 py-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            About Beacon
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            The full school suite — for any school
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Not “just another gradebook.” Beacon is the operating system for schools: academics,
            family communications, principal operations, and tuition payments — familiar where
            teachers need speed, clearer where families need calm.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Going after FACTS on family experience — not on aid/collections depth. See{' '}
            <Link href="/vs/facts" className="font-medium text-primary hover:underline">
              Beacon vs FACTS
            </Link>
            .
          </p>
        </div>

        <Card className="overflow-hidden border-border/80 shadow-[var(--shadow-soft)]">
          <div className="border-b border-border/80 bg-muted/30 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary font-bold text-lg text-primary-foreground">
                B
              </span>
              <div>
                <p className="text-lg font-semibold leading-tight text-foreground">Beacon</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Multi-school ready · Currently serving {brand.name}
                </p>
              </div>
            </div>
          </div>
          <CardContent className="space-y-5 pt-6">
            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight text-foreground">What makes it different</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Dinner Table Digest, Conference Brief, Beacon Pulse, and Beacon Signal — products
                  parents and principals actually use, not another portal of tables.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <School className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight text-foreground">Your school’s brand</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  School name, mission, contact, and website come from your school record — so Beacon
                  looks like <strong className="text-foreground">{brand.name}</strong>, not a demo
                  for someone else.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight text-foreground">Trust & access</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Parents only see linked students. Staff are scoped by school. Email and QuickBooks
                  modes are labeled (live vs log-only / sandbox) so leadership never ships a surprise.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <HandHeart className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-2 text-sm leading-relaxed">
                <h2 className="font-semibold tracking-tight text-foreground">Stewardship & origin</h2>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">
                    Beacon is created by CommonCentsIP as a volunteer ministry.
                  </strong>{' '}
                  This system was developed under the leadership of Chris Cowan.
                </p>
                <p className="text-muted-foreground">
                  All income generated by using Beacon for other schools is distributed to help with
                  teacher salaries, tuition support, and for 1 annual vacation for the principal.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-dashed border-border/80">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Heart className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-2 text-sm leading-relaxed text-muted-foreground">
                <p>
                  <strong className="text-foreground">The full suite:</strong> teachers get fast
                  grade entry; parents get transparent calculations; the principal gets operations,
                  tuition, and QuickBooks — one Beacon, not five logins.
                </p>
                <ul className="space-y-1 pt-1 text-sm text-muted-foreground">
                  <li>Transparent grades · Dinner Table Digest · Conference Brief</li>
                  <li>Beacon Pulse · Beacon Signal · Teacher Quick Mode · Family Desk</li>
                  <li>School-owned tuition · QuickBooks when you connect it</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="rounded-2xl border border-border/80 bg-card p-5 sm:p-6">
          <h2 className="text-lg font-semibold tracking-tight text-foreground">
            Bring Beacon to your school
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Principals and administrators — send a short note. We’ll reply by email.
          </p>
          <div className="mt-4">
            <SchoolInquiryForm compact />
          </div>
        </section>

        <p className="flex flex-wrap justify-center gap-4 text-center text-sm">
          <Link href="/" className={buttonClassName('ghost', 'sm', 'text-primary')}>
            Product home
          </Link>
          <Link href="/vs/facts" className={buttonClassName('ghost', 'sm', 'text-primary')}>
            vs FACTS
          </Link>
          <Link href="/school" className={buttonClassName('ghost', 'sm', 'text-primary')}>
            {brand.shortName} school site
          </Link>
          <Link href="/login" className={buttonClassName('primary', 'sm')}>
            Sign in to Beacon →
          </Link>
        </p>
      </div>
    </div>
  )
}

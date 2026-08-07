import Link from 'next/link'
import type { Metadata } from 'next'
import { Heart, School, Shield, Sparkles, HandHeart, Cross } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonClassName } from '@/components/ui/button'
import { loadSchoolBrand } from '@/lib/school-brand'
import {
  BEACON_ATTACK_LINES,
  COMPARE_ROWS,
  FACTS_FAQS,
  FACTS_ORG,
  FACTS_SCALE,
} from '@/lib/marketing/facts-compare'

export const metadata: Metadata = {
  title: 'About Beacon | Christian school tool vs FACTS',
  description:
    'Beacon is a Christian school tool built by a Christian school — not Nelnet (NYSE: NNI). Honest Beacon vs FACTS compare for faith-based schools.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About Beacon — built by a Christian school',
    description:
      'Not a publicly traded New York ed-tech company. Beacon vs FACTS: ministry-stewarded school software.',
    url: '/about',
    type: 'website',
  },
}

export default async function AboutPage() {
  const brand = await loadSchoolBrand(null)

  return (
    <div className="min-h-screen beacon-shell">
      <header className="border-b border-border/80 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/login" className="flex items-center gap-2.5 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
              B
            </span>
            Beacon
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link
              href="#vs-facts"
              className="hidden text-navy-foreground/70 transition hover:text-navy-foreground sm:inline"
            >
              vs FACTS
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium text-navy-foreground/70 transition hover:text-navy-foreground"
            >
              Sign in →
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl animate-beacon-in space-y-10 px-4 py-10 sm:px-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            About Beacon
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            A Christian school tool built by a Christian school
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-muted-foreground">
            Not a publicly traded suite from Wall Street. Beacon is stewarded by{' '}
            <strong className="text-foreground">Common Cents IP</strong> as a volunteer ministry —
            built inside a Christian school for Christian and independent schools that want calm
            ops and families who actually open what you send.
          </p>
        </div>

        {/* Punchline vs FACTS / Nelnet */}
        <aside className="rounded-2xl border border-warning/35 bg-warning-soft/50 px-5 py-5 sm:px-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-warning">
            Straight answer
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-foreground">
            Is FACTS a Christian organization?
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-foreground">
            {FACTS_ORG.blunt}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{FACTS_ORG.detail}</p>
          <p className="mt-4 text-sm font-semibold text-foreground">
            Beacon is not a publicly traded New York ed-tech story. It is a Christian school tool
            built by a Christian school.
          </p>
          <a
            href="#vs-facts"
            className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            See Beacon vs FACTS →
          </a>
        </aside>

        <ul className="space-y-3 border-l-2 border-primary/40 pl-5">
          {BEACON_ATTACK_LINES.map((line) => (
            <li key={line} className="text-sm font-medium leading-relaxed text-foreground sm:text-[15px]">
              {line}
            </li>
          ))}
        </ul>

        <Card className="overflow-hidden border-border/80 shadow-[var(--shadow-soft)]">
          <div className="border-b border-border/80 bg-muted/30 px-6 py-5">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-lg font-bold text-primary-foreground">
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
                <Cross className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold tracking-tight text-foreground">Built where ministry happens</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Developed under the leadership of Chris Cowan for real Christian school life —
                  chapel, classrooms, car line, and the dinner table — not a New York product
                  roadmap.
                </p>
              </div>
            </div>

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
                    Beacon is created by Common Cents IP as a volunteer ministry.
                  </strong>{' '}
                  This system was developed under the leadership of Chris Cowan.
                </p>
                <p className="text-muted-foreground">
                  All income generated by using Beacon for other schools is distributed to help with
                  teacher salaries, tuition support, and for 1 annual vacation for the principal —
                  not dividends for a public-company ticker.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Beacon vs FACTS */}
        <section id="vs-facts" className="scroll-mt-24 space-y-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
              Beacon vs FACTS
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              Christian school software — or a Wall Street suite?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              FACTS ({FACTS_ORG.parent}, {FACTS_ORG.ticker}) claims about{' '}
              <strong className="text-foreground">{FACTS_SCALE.schools} schools</strong> and{' '}
              <strong className="text-foreground">{FACTS_SCALE.families} families</strong>. Scale is
              real. So is the ownership: a publicly traded company selling into faith-based schools —
              not a Christian school building tools for its own mission.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2.5 font-semibold text-foreground">Dimension</th>
                  <th className="px-3 py-2.5 font-semibold text-foreground">FACTS</th>
                  <th className="px-3 py-2.5 font-semibold text-foreground">Beacon</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.dimension} className="border-b border-border/80 last:border-b-0">
                    <td className="px-3 py-3 align-top font-medium text-foreground">
                      {row.dimension}
                    </td>
                    <td className="px-3 py-3 align-top text-muted-foreground">{row.facts}</td>
                    <td className="px-3 py-3 align-top text-foreground">{row.beacon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-muted-foreground">{FACTS_SCALE.note}</p>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">FAQ</h3>
            {FACTS_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="rounded-xl border border-border bg-card px-4 py-3 open:bg-muted/20"
              >
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  {faq.question}
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

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
                  <li>Beacon Pulse · Beacon Signal · Teacher Quick Mode</li>
                  <li>School-owned tuition · QuickBooks when you connect it</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="flex flex-wrap justify-center gap-4 text-center text-sm">
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

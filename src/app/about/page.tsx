import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  BriefcaseBusiness,
  CheckCircle2,
  HeartHandshake,
  MessageCircleMore,
  School,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { buttonClassName } from '@/components/ui/button'
import { DesignPartnerInquiryForm } from '@/components/marketing/DesignPartnerInquiryForm'
import { beaconCraftTourUrl } from '@/lib/beaconcraft-url'
import { buildSchoolContextLinks } from '@/lib/marketing/design-partner'
import { isDesignPartnerInquiryReady } from '@/lib/marketing/inquiry-readiness'

export const metadata: Metadata = {
  title: 'Beacon for Small Schools | Design-Partner Program',
  description:
    'Explore Beacon’s school-branded academic, family communication and operations workflows, current design-partner scope, and trust practices.',
}

const roleViews = [
  {
    icon: BookOpenCheck,
    title: 'Teachers',
    detail: 'Classes, assignments, grade entry, attendance and phone-first Quick Mode.',
  },
  {
    icon: Users,
    title: 'Families',
    detail:
      'Linked-child grades, family updates, missing-work context and payment links when enabled.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'School office',
    detail: 'Roster, announcements, go-live checks and school-owned billing workflows.',
  },
  {
    icon: School,
    title: 'Leadership',
    detail:
      'A school-wide operational view, whole-child signals and explicit live-versus-demo status.',
  },
] as const

const distinctWorkflows = [
  {
    title: 'Dinner Table Digest',
    detail:
      'Turns school information into a plain-language family summary with celebration, watch and conversation prompts.',
  },
  {
    title: 'Conference Brief',
    detail: 'Combines grades, whole-child check-ins and attendance in a one-page preparation view.',
  },
  {
    title: 'Beacon Signal',
    detail: 'Gives leadership a compact school-climate and pastoral-attention view.',
  },
  {
    title: 'Teacher Quick Mode',
    detail: 'Puts attendance, scores and whole-child check-ins into a phone-first workflow.',
  },
] as const

const corePilot = [
  'School identity and branding',
  'Student roster, teacher accounts and classes',
  'Assignments, grades and attendance',
  'Parent–student links and family-facing views',
  'Teacher, parent, phone and email checks',
  'Access review and leadership soft-launch approval',
] as const

const currentFit = [
  'A private or independent K–12 school with a lean office and leadership team',
  'A school that wants one branded home for core academic and family workflows',
  'A team able to begin with a bounded teacher and parent group',
  'Leadership willing to give structured workflow feedback',
] as const

export default async function AboutPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; slug?: string }>
}) {
  const sp = await searchParams
  const { schoolHref, beaconHref, trustHref } = buildSchoolContextLinks(sp)
  const inquiryReady = await isDesignPartnerInquiryReady()
  const tourHref = beaconCraftTourUrl()

  return (
    <div className="min-h-screen overflow-x-hidden beacon-shell text-foreground">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/95 text-navy-foreground backdrop-blur-xl pt-safe">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href={beaconHref}
            aria-label="Beacon company home"
            className="flex items-center gap-2.5 font-semibold"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              B
            </span>
            <span>
              <span className="block leading-tight">Beacon</span>
              <span className="block text-[10px] font-medium uppercase tracking-[0.14em] text-navy-foreground/55">
                School suite
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-1" aria-label="Beacon company">
            <a
              href="#product"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-navy-foreground/70 hover:bg-white/5 hover:text-navy-foreground sm:inline-flex"
            >
              Product
            </a>
            <a
              href="#pilot"
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-navy-foreground/70 hover:bg-white/5 hover:text-navy-foreground md:inline-flex"
            >
              Pilot
            </a>
            <Link
              href={trustHref}
              className="hidden rounded-md px-3 py-2 text-sm font-medium text-navy-foreground/70 hover:bg-white/5 hover:text-navy-foreground sm:inline-flex"
            >
              Trust
            </Link>
            <Link href="/login" className={buttonClassName('primary', 'sm', 'ml-1')}>
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-navy text-navy-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgb(2_132_199_/_0.24),transparent_42%),radial-gradient(circle_at_85%_5%,rgb(56_189_248_/_0.12),transparent_38%)]" />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-300">
                Beacon for small schools
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-[1.04] tracking-[-0.04em] sm:text-6xl">
                A calmer path from classroom work to family understanding.
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
                Beacon brings grades, attendance, family communication and principal launch
                controls into one school-branded system. It is currently being prepared through a
                controlled design-partner pilot.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {inquiryReady ? (
                  <a href="#contact" className={buttonClassName('primary', 'lg')}>
                    Ask about a design-partner conversation
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </a>
                ) : null}
                <a
                  href={tourHref}
                  className={buttonClassName(
                    'outline',
                    'lg',
                    'border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white'
                  )}
                >
                  Explore the public demo
                </a>
              </div>
              <Link
                href={trustHref}
                className="mt-5 inline-flex min-h-11 items-center text-sm font-medium text-sky-300 hover:text-sky-200 hover:underline"
              >
                Review Trust &amp; Data Practices →
              </Link>
            </div>

            <Card className="border-white/10 bg-white/[0.06] text-white shadow-[var(--shadow-lift)] backdrop-blur">
              <CardContent className="space-y-4 pt-6">
                <Badge variant="sky">Current stage · design-partner program</Badge>
                <h2 className="text-xl font-semibold tracking-tight">A focused evaluation, not a blanket promise.</h2>
                <p className="text-sm leading-relaxed text-slate-300">
                  Participation and scope are assessed school by school. This page does not promise
                  availability, pricing, production approval or a complete replacement for an
                  existing student information system.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section id="product" className="scroll-mt-24 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                One school rhythm
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Four connected views, one school identity.
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Beacon is designed around the work each role already needs to do, while keeping
                records and access scoped to the school.
              </p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {roleViews.map((view) => (
                <Card key={view.title} className="h-full border-border/80">
                  <CardContent className="pt-6">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <view.icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="mt-5 font-semibold tracking-tight">{view.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {view.detail}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border/80 bg-card/45 py-16 sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
            <div>
              <Sparkles className="h-8 w-8 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">What Beacon is testing</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                These workflows are the center of the current product hypothesis: school
                information should become more useful to families, teachers and leadership—not
                simply another table to check.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {distinctWorkflows.map((workflow) => (
                <div key={workflow.title} className="rounded-2xl border border-border/80 bg-card p-5">
                  <h3 className="font-semibold tracking-tight">{workflow.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {workflow.detail}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pilot" className="scroll-mt-24 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                Bounded design-partner pilot
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                Start with the core. Add complexity only when it earns its place.
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                Beacon is looking for conversations with private or independent K–12 schools
                willing to evaluate a focused core rollout. Scope and participation are assessed
                school by school.
              </p>
            </div>

            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <HeartHandshake className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="font-semibold tracking-tight">Core pilot scope</h3>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm">
                    {corePilot.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-border/80">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h3 className="font-semibold tracking-tight">Best current fit</h3>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm text-muted-foreground">
                    {currentFit.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="mt-5 rounded-2xl border border-dashed border-border px-5 py-4 text-sm leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Optional, not pilot prerequisites:</strong>{' '}
              billing and accounting connections, card payments, badges and kiosks, BeaconCraft,
              cameras, Slack and SMS. A school enables only the modules included in its agreed scope.
            </div>
          </div>
        </section>

        <section id="trust" className="border-y border-border/80 bg-navy py-16 text-navy-foreground sm:py-24">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 text-sky-300">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                <p className="text-xs font-semibold uppercase tracking-[0.16em]">Trust before rollout</p>
              </div>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight">Know what is implemented—and what is still open.</h2>
              <p className="mt-4 leading-relaxed text-slate-300">
                Beacon documents current access boundaries, token-based workflows, service-provider
                categories and unresolved procurement commitments. Review the factual overview
                before considering production use.
              </p>
            </div>
            <Link
              href={trustHref}
              className={buttonClassName(
                'outline',
                'lg',
                'border-white/20 bg-white/10 text-white hover:bg-white/15 hover:text-white'
              )}
            >
              Review trust practices
            </Link>
          </div>
        </section>

        <section id="contact" className="scroll-mt-24 py-16 sm:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <MessageCircleMore className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              Is your school a possible design-partner fit?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              Start with a conversation about your current workflow, proposed pilot group and
              procurement requirements. No pricing, availability or production commitment is
              implied.
            </p>
            {inquiryReady ? (
              <Card className="mx-auto mt-8 max-w-3xl border-border/80 text-left shadow-[var(--shadow-soft)]">
                <CardContent className="pt-6">
                  <DesignPartnerInquiryForm />
                </CardContent>
              </Card>
            ) : (
              <p className="mt-5 text-sm text-muted-foreground">
                Direct design-partner inquiries are not configured on this deployment yet.
              </p>
            )}
            <a href={tourHref} className={buttonClassName('ghost', 'sm', 'mt-5 text-primary')}>
              Explore the public demo instead →
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/80 py-8 pb-safe">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-sm text-muted-foreground sm:flex-row sm:px-6 sm:text-left">
          <p>
            <strong className="text-foreground">Beacon</strong> · Current design-partner program
          </p>
          <p className="flex flex-wrap justify-center gap-x-4 gap-y-2 sm:justify-end">
            <Link href={schoolHref} className="hover:text-primary hover:underline">School site</Link>
            <Link href={trustHref} className="hover:text-primary hover:underline">Trust &amp; data practices</Link>
            <Link href="/login" className="hover:text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </footer>
    </div>
  )
}

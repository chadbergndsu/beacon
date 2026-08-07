import Link from 'next/link'
import { FactsLandingTabs } from '@/components/marketing/FactsLandingTabs'
import { SchoolInquiryForm } from '@/components/marketing/SchoolInquiryForm'
import { JsonLd } from '@/components/seo/JsonLd'
import { buttonClassName } from '@/components/ui/button'
import { softwareApplicationJsonLd, organizationJsonLd } from '@/lib/seo/json-ld'

/**
 * Product landing for schools evaluating Beacon — calm, brand-first, one clear ask.
 */
export function ProductLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <JsonLd data={[organizationJsonLd(), softwareApplicationJsonLd()]} />

      <header className="relative z-10 border-b border-white/10 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-semibold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
              B
            </span>
            Beacon
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            <Link
              href="/vs/facts"
              className="hidden text-navy-foreground/75 transition hover:text-navy-foreground sm:inline"
            >
              vs FACTS
            </Link>
            <a
              href="#fun-facts"
              className="hidden text-navy-foreground/75 transition hover:text-navy-foreground sm:inline"
            >
              Fun Facts
            </a>
            <Link
              href="/about"
              className="hidden text-navy-foreground/75 transition hover:text-navy-foreground sm:inline"
            >
              About
            </Link>
            <Link
              href="/school"
              className="hidden text-navy-foreground/75 transition hover:text-navy-foreground sm:inline"
            >
              School site
            </Link>
            <Link href="/login" className={buttonClassName('primary', 'sm')}>
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — one composition */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(90% 70% at 10% 0%, color-mix(in oklab, #0284c7 35%, transparent), transparent 55%), radial-gradient(70% 60% at 90% 20%, color-mix(in oklab, #0a1628 50%, transparent), transparent 50%), linear-gradient(165deg, #0a1628 0%, #0c4a6e 48%, #0369a1 100%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M0 60V0h60\" fill=\"none\" stroke=\"%23fff\" stroke-width=\"1\"/%3E%3C/svg%3E")',
          }}
          aria-hidden
        />

        <div className="relative mx-auto flex min-h-[min(88vh,720px)] max-w-5xl flex-col justify-end px-4 pb-14 pt-20 sm:px-6 sm:pb-20 sm:pt-28">
          <p className="animate-beacon-in text-[11px] font-bold uppercase tracking-[0.2em] text-sky-200/90">
            Beacon
          </p>
          <h1 className="animate-beacon-in mt-3 max-w-2xl text-4xl font-semibold tracking-tight text-white sm:text-5xl sm:leading-[1.08]">
            The FACTS alternative families actually open
          </h1>
          <p className="animate-beacon-in mt-4 max-w-xl text-base leading-relaxed text-sky-100/90 sm:text-lg">
            FACTS owns tuition scale. Beacon owns calm family communications — Family Desk, Dinner
            Table Digests, and logged replies — without the portal black hole.
          </p>
          <div className="animate-beacon-in mt-8 flex flex-wrap gap-3">
            <a
              href="#inquiry"
              className="inline-flex h-11 items-center justify-center rounded-md bg-white px-5 text-sm font-semibold text-navy transition hover:bg-sky-50"
            >
              Leave the black hole
            </a>
            <Link
              href="/vs/facts"
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/30 bg-white/5 px-5 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
            >
              Beacon vs FACTS
            </Link>
          </div>
        </div>
      </section>

      {/* One job: what you get */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Built for schools</p>
        <h2 className="mt-2 max-w-xl text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Replace the black hole — keep what teachers already know how to do
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          Beacon logs every family email and reply. Parents get Notes from school. Principals get
          go-live health, tuition, and a calm office desk — not another dashboard of widgets.
        </p>
        <ul className="mt-10 grid gap-8 sm:grid-cols-3">
          {[
            {
              title: 'Family Desk',
              body: 'Intention-based notes home, logged delivery, and parent replies that don’t disappear into office mail alone.',
            },
            {
              title: 'Dinner Table Digest',
              body: 'A 60-second plain-English story parents can actually talk about at supper — not a portal of tables.',
            },
            {
              title: 'Honest ops',
              body: 'Email and payments say when they’re live vs log-only. Auth fails closed. Your school owns the data.',
            },
          ].map((item, i) => (
            <li
              key={item.title}
              className="animate-beacon-in border-t border-border pt-5"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <h3 className="text-base font-semibold tracking-tight text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* FACTS: The case | Fun Facts */}
      <FactsLandingTabs />

      {/* Inquiry */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto grid max-w-5xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              For other schools
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Ready when you are
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              Tell us about your school — especially if you’re on FACTS / RenWeb and want a calmer
              family layer. We’ll reply by email — no sales theater, no spam list. Pilots start with
              academics and Family Desk; money tools stay optional until you’re ready.
            </p>
            <p className="mt-6 text-sm text-muted-foreground">
              Prefer email?{' '}
              <a
                className="font-medium text-primary hover:underline"
                href="mailto:office@commoncentsip.com?subject=Leaving%20FACTS%20%2F%20Beacon%20for%20our%20school"
              >
                office@commoncentsip.com
              </a>
            </p>
          </div>
          <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6">
            <SchoolInquiryForm />
          </div>
        </div>
      </section>

      <footer className="border-t border-border bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm sm:px-6">
          <p className="text-navy-foreground/70">
            © {new Date().getFullYear()} Beacon · Common Cents IP
          </p>
          <div className="flex flex-wrap gap-4 text-navy-foreground/80">
            <Link href="/vs/facts" className="hover:text-white">
              vs FACTS
            </Link>
            <a href="#fun-facts" className="hover:text-white">
              Fun Facts
            </a>
            <Link href="/vs/renweb" className="hover:text-white">
              RenWeb alt
            </Link>
            <Link href="/about" className="hover:text-white">
              About
            </Link>
            <Link href="/school" className="hover:text-white">
              School site
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

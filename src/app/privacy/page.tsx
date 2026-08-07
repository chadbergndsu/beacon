import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Database,
  FileWarning,
  Globe2,
  ServerCog,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonClassName } from '@/components/ui/button'
import { buildSchoolContextLinks } from '@/lib/marketing/design-partner'

export const metadata: Metadata = {
  title: 'Trust & Data Practices | Beacon',
  description:
    'A factual overview of the student data Beacon handles, product access controls, optional integrations, and open procurement questions.',
}

const accessRoles = [
  {
    role: 'Parents',
    access: 'Students explicitly linked to their account, including the linked child’s family-facing records.',
  },
  {
    role: 'Teachers',
    access: 'Classes assigned to them and students enrolled in those classes.',
  },
  {
    role: 'School staff',
    access: 'School-wide operational records within their own school; not billing or QuickBooks credentials.',
  },
  {
    role: 'Principal / admin',
    access: 'School-wide administration, including billing and configured accounting connections.',
  },
] as const

const dataCategories = [
  ['Product inquiries', 'Name, work email, role, school and workflow notes submitted through the design-partner form.'],
  ['Identity & contact', 'Names, dates of birth, photos, family links, contact and emergency information.'],
  ['Learning records', 'Classes, enrollment, assignments, grades, attendance, report cards and teacher notes.'],
  ['Student support', 'Allergies, medical notes, discipline records and whole-child check-ins when a school uses them.'],
  ['School operations', 'Announcements, communications, aftercare, badge scans and room events when enabled.'],
  [
    'Product activity',
    'Coarse authenticated product activity by school, person, role, workflow category and UTC date. The pilot activity ledger does not include student identity, URL, IP address, user agent or arbitrary payload.',
  ],
  [
    'Parent feedback',
    'Weekly parent helpfulness responses and optional comments.',
  ],
  ['Billing', 'Products, invoices, payment records and accounting connection status when enabled.'],
] as const

const providerGroups = [
  ['Core platform', 'Supabase for database and authentication; Vercel for application hosting.'],
  ['Communication', 'Resend or school SMTP for email; Twilio and Slack only when configured.'],
  ['Payments & accounting', 'Stripe and QuickBooks only when the school enables those modules.'],
  ['Operations', 'Upstash for production rate limiting and Sentry for error monitoring when configured.'],
] as const

/**
 * Factual product documentation for school diligence. This is intentionally
 * not represented as a legal privacy notice, DPA, or compliance certification.
 */
export default async function PrivacyPage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; slug?: string }>
}) {
  const { schoolHref, beaconHref, loginHref } = buildSchoolContextLinks(await searchParams)
  return (
    <div className="min-h-screen beacon-shell">
      <header className="border-b border-border/80 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href={beaconHref} className="flex items-center gap-2.5 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
              B
            </span>
            Beacon
          </Link>
          <Link
            href={loginHref}
            className="text-sm font-medium text-navy-foreground/70 transition hover:text-navy-foreground"
          >
            Sign in →
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 sm:py-14">
        <section aria-labelledby="trust-title" className="max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Trust center
          </p>
          <h1 id="trust-title" className="mt-1 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Trust &amp; Data Practices
          </h1>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Beacon brings academic, family and school-office workflows together. That means schools
            should understand what information the product can hold, who can reach it and which
            deployment choices remain theirs.
          </p>
          <div className="mt-5 rounded-xl border border-warning/25 bg-warning-soft px-4 py-3 text-sm leading-relaxed text-foreground">
            <strong>Scope of this page:</strong> factual product documentation. It is not a legal
            privacy notice, data processing agreement, certification or substitute for counsel.
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                Implemented now
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Database role and school boundaries, account and token access modes, and operational
                launch checks.
              </p>
            </div>
            <div className="rounded-xl border border-border/80 bg-card px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
                Still required
              </p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Formal legal, retention, incident, service-level and accessibility commitments for
                production procurement.
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="data-heading">
          <div className="mb-3 flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="data-heading" className="text-xl font-semibold tracking-tight text-foreground">
              Information Beacon can handle
            </h2>
          </div>
          <p className="mb-4 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            The exact categories depend on the modules a school enables and the information it enters.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {dataCategories.map(([title, detail]) => (
              <Card key={title} className="border-border/80">
                <CardContent className="pt-5">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{detail}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="access-heading">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="access-heading" className="text-xl font-semibold tracking-tight text-foreground">
              Who can access school data
            </h2>
          </div>
          <Card className="overflow-hidden border-border/80">
            <CardContent className="divide-y divide-border p-0">
              {accessRoles.map(({ role, access }) => (
                <div key={role} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr] sm:gap-4">
                  <h3 className="font-semibold text-foreground">{role}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{access}</p>
                </div>
              ))}
            </CardContent>
          </Card>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Database row-level policies enforce these role and school boundaries. Parent links also
            require the parent profile and student to belong to the same school. School leadership
            can see aggregated pilot evidence and parent feedback for its school.
          </p>
        </section>

        <section aria-labelledby="surface-heading" className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/80">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 id="surface-heading" className="font-semibold text-foreground">
                    Public, account and token access
                  </h2>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>The public school site shows school-provided brand and contact information.</li>
                    <li>The public campus tour uses fictional student identities, not live roster records.</li>
                    <li>Staff tools, role-scoped student records and the school’s campus twin use account sign-in.</li>
                    <li>
                      Kiosks, device scans and family payment portals can use bearer-token links without
                      an account login. A valid token limits the view or action to that specific workflow.
                    </li>
                    <li>
                      Schools should treat token links as secrets, rotate exposed kiosk/device links and
                      share family payment links only with the intended recipient.
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-foreground">Implemented safeguards</h2>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>School and role boundaries are enforced in the database, not only in page code.</li>
                    <li>
                      Production authentication is required. Durable rate limiting is required before
                      public or multi-instance production traffic; the explicitly labeled in-memory
                      break-glass mode is only for controlled, non-public pilots.
                    </li>
                    <li>Email and accounting connections show live, log-only or demo status.</li>
                    <li>Go-live health checks, access review and leadership approval are tracked separately.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <section aria-labelledby="providers-heading">
          <div className="mb-4 flex items-center gap-2">
            <ServerCog className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="providers-heading" className="text-xl font-semibold tracking-tight text-foreground">
              Service providers and optional integrations
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {providerGroups.map(([title, detail], index) => (
              <div key={title} className="rounded-xl border border-border/80 bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-semibold text-foreground">{title}</h3>
                  <Badge variant={index === 0 ? 'sky' : 'muted'}>
                    {index === 0 ? 'Core' : 'Conditional'}
                  </Badge>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{detail}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            This is a product-level provider overview, not a contractual or complete subprocessor list.
          </p>
        </section>

        <section aria-labelledby="responsibility-heading" className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/80">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Settings2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 id="responsibility-heading" className="font-semibold text-foreground">
                    School responsibilities
                  </h2>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
                    <li>Use unique staff and family accounts; do not share generic passwords.</li>
                    <li>Verify parent–student links and remove access when relationships change.</li>
                    <li>Complete migration, login, phone, email and access-review checks before launch.</li>
                    <li>Enable only the integrations the school intends to use and test their mode.</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning/25 bg-warning-soft">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <FileWarning className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                <div>
                  <h2 className="font-semibold text-foreground">Before production procurement</h2>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Formal retention and deletion terms, a data processing agreement, incident-notice
                    commitments, service levels and an accessibility conformance statement are not
                    established by this page. A school should require those commitments in writing
                    before treating Beacon as an approved production vendor.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        <footer className="border-t border-border/80 pt-6">
          <p className="mb-4 text-center text-sm text-muted-foreground">
            Evaluating Beacon? Use this overview alongside your school’s legal, security and
            accessibility review.
          </p>
          <p className="flex flex-wrap justify-center gap-3 text-center text-sm">
            <Link href={beaconHref} className={buttonClassName('ghost', 'sm', 'text-primary')}>
              About Beacon
            </Link>
            <Link href={schoolHref} className={buttonClassName('ghost', 'sm', 'text-primary')}>
              School site
            </Link>
            <Link href={loginHref} className={buttonClassName('primary', 'sm')}>
              Sign in →
            </Link>
          </p>
        </footer>
      </main>
    </div>
  )
}

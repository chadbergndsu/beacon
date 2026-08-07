import Link from 'next/link'
import { Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonClassName } from '@/components/ui/button'

const EFFECTIVE = '2026-08-07'
const SUPPORT = 'office@commoncentsip.com'

/**
 * Store / web privacy notice — product truth for App Store & Play listings.
 * Not a substitute for counsel; schools remain data controllers for student records.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen beacon-shell">
      <header className="border-b border-border/80 bg-navy text-navy-foreground">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Link href="/login" className="flex items-center gap-2.5 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm text-primary-foreground">
              B
            </span>
            Beacon
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium text-navy-foreground/70 transition hover:text-navy-foreground"
          >
            Sign in →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Privacy
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Privacy &amp; student data
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Effective {EFFECTIVE}. Beacon is school operations software. Each school controls its
            roster and family communications. This page explains what the product does — it is not
            legal advice. Schools should involve counsel for FERPA / state student-privacy compliance.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Contact:{' '}
            <a className="font-medium text-primary hover:underline" href={`mailto:${SUPPORT}`}>
              {SUPPORT}
            </a>
          </p>
        </div>

        <Card className="border-border/80">
          <CardContent className="space-y-5 pt-6 text-sm leading-relaxed text-muted-foreground">
            <div className="flex gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Who controls the data</h2>
                <p className="mt-1">
                  The <strong className="text-foreground">school</strong> is the primary controller
                  of student and family records entered into Beacon. Common Cents IP / Beacon
                  provides the application and hosting infrastructure.
                </p>
              </div>
            </div>

            <div>
              <h2 className="font-semibold text-foreground">What we process</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>Account profile: name, email, role, school membership</li>
                <li>Roster &amp; academics: students, classes, grades, attendance, lesson plans</li>
                <li>Family communications: announcements, email outbox/inbox, optional SMS</li>
                <li>Billing: invoices, payment status, optional Stripe / QuickBooks identifiers</li>
                <li>Campus ops: badge scans, aftercare sessions, kiosk tokens (when enabled)</li>
                <li>Diagnostics: optional error tracking (Sentry) and health probes</li>
              </ul>
            </div>

            <div>
              <h2 className="font-semibold text-foreground">Role-based access</h2>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>
                  <strong className="text-foreground">Parents</strong> only see students linked in
                  parent–student records.
                </li>
                <li>
                  <strong className="text-foreground">Teachers</strong> only open classes they teach.
                </li>
                <li>
                  <strong className="text-foreground">Principal / admin / staff</strong> operate
                  school-wide within their <code className="rounded bg-muted px-1 text-xs">school_id</code>.
                </li>
              </ul>
            </div>

            <div>
              <h2 className="font-semibold text-foreground">Children &amp; education records</h2>
              <p className="mt-1">
                Beacon is used by schools and families in an education context. We do not sell
                student personal information. Schools decide what to enter and which parents to link.
                Account deletion / data export requests should go to the school office; platform
                support can assist at {SUPPORT}.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-foreground">Third-party processors</h2>
              <p className="mt-1">
                Depending on school configuration, Beacon may use: Supabase (auth/database), Vercel
                (hosting), Resend or SMTP (email), Twilio (optional SMS), Stripe (optional card pay),
                Intuit QuickBooks (optional accounting sync), Sentry (optional errors), Upstash
                (optional rate limits), Slack (optional office notify).
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-foreground">Retention</h2>
              <p className="mt-1">
                Records remain while the school uses Beacon and the school’s account remains active.
                Schools may request deletion of their tenant data. Operational logs and email outbox
                rows are retained for delivery audit and support.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-foreground">Security honesty</h2>
              <p className="mt-1">
                Production auth fails closed without Supabase configuration. Emails are log-only
                until a live transport is configured. QuickBooks stays labeled demo until Intuit
                OAuth is connected. Prefer unique staff accounts and applied database migrations for
                RLS.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-foreground">Mobile apps</h2>
              <p className="mt-1">
                Beacon may be offered as a Progressive Web App and as thin native shells (App Store /
                Google Play) that load the same HTTPS web application. Those shells do not create a
                separate student database on the device.
              </p>
            </div>

            <div>
              <h2 className="font-semibold text-foreground">Changes</h2>
              <p className="mt-1">
                We may update this page as the product changes. Material updates will refresh the
                effective date above. Continued use after changes constitutes acknowledgment of the
                updated notice where permitted by law.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="flex flex-wrap justify-center gap-4 text-center text-sm">
          <Link href="/terms" className={buttonClassName('ghost', 'sm', 'text-primary')}>
            Terms of use
          </Link>
          <Link href="/about" className={buttonClassName('ghost', 'sm', 'text-primary')}>
            About Beacon
          </Link>
          <Link href="/school" className={buttonClassName('ghost', 'sm', 'text-primary')}>
            School site
          </Link>
        </p>
      </div>
    </div>
  )
}

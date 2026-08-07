import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { buttonClassName } from '@/components/ui/button'

const EFFECTIVE = '2026-08-07'
const SUPPORT = 'office@commoncentsip.com'

/**
 * Terms of use — required for App Store / Play listings alongside privacy.
 * Plain language; not a substitute for counsel.
 */
export default function TermsPage() {
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
            href="/privacy"
            className="text-sm font-medium text-navy-foreground/70 transition hover:text-navy-foreground"
          >
            Privacy →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Terms
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Terms of use
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Effective {EFFECTIVE}. By using Beacon (web app or store shells), you agree to these
            terms. Schools remain responsible for lawful use of student and family data.
          </p>
        </div>

        <Card className="border-border/80">
          <CardContent className="space-y-4 pt-6 text-sm leading-relaxed text-muted-foreground">
            <div>
              <h2 className="font-semibold text-foreground">The service</h2>
              <p className="mt-1">
                Beacon provides school operations software: academics, family communications,
                principal tools, optional billing, and related features. Features depend on your
                school’s configuration and plan.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Accounts</h2>
              <p className="mt-1">
                You must provide accurate account information, keep credentials confidential, and use
                Beacon only for legitimate school purposes. Schools assign roles (parent, teacher,
                staff, principal/admin).
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Acceptable use</h2>
              <p className="mt-1">
                Do not attempt to access another school’s data, abuse rate limits, probe for
                vulnerabilities without authorization, or use Beacon to harass families or staff.
                We may suspend accounts that threaten system integrity or other tenants.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Payments</h2>
              <p className="mt-1">
                Optional family payments are processed by Stripe (or recorded as office payments).
                Schools set tuition products and invoices. Beacon does not provide banking advice.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Availability</h2>
              <p className="mt-1">
                We aim for reliable uptime but do not guarantee uninterrupted service. Use Principal
                → Go-live and <code className="rounded bg-muted px-1 text-xs">/api/health</code> for
                operational checks.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Mobile store shells</h2>
              <p className="mt-1">
                Native App Store / Play listings load the same Beacon web application over HTTPS.
                Store review requirements and platform terms also apply when you install from those
                stores.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Disclaimer</h2>
              <p className="mt-1">
                Beacon is provided “as is” to the extent permitted by law. Schools should maintain
                independent backups of critical records and verify money/comms settings before
                relying on them in production.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Contact</h2>
              <p className="mt-1">
                Questions:{' '}
                <a className="font-medium text-primary hover:underline" href={`mailto:${SUPPORT}`}>
                  {SUPPORT}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="flex flex-wrap justify-center gap-4 text-center text-sm">
          <Link href="/privacy" className={buttonClassName('ghost', 'sm', 'text-primary')}>
            Privacy
          </Link>
          <Link href="/login" className={buttonClassName('ghost', 'sm', 'text-primary')}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}

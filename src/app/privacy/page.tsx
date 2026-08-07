import Link from 'next/link'
import { Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { buttonClassName } from '@/components/ui/button'

/**
 * Trust page — market buyers (principals) ask FERPA/access questions early.
 * Keep plain language; no legal theater.
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
            Trust
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Privacy &amp; student data
          </h1>
          <p className="mt-3 leading-relaxed text-muted-foreground">
            Beacon is built so each school controls its own roster. This page summarizes how access
            works in the product — not a substitute for your school’s legal counsel.
          </p>
        </div>

        <Card className="border-border/80">
          <CardContent className="space-y-4 pt-6 text-sm leading-relaxed text-muted-foreground">
            <div className="flex gap-3">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <h2 className="font-semibold text-foreground">Role-based access</h2>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    <strong className="text-foreground">Parents</strong> only see students linked
                    in parent–student records.
                  </li>
                  <li>
                    <strong className="text-foreground">Teachers</strong> only open classes they
                    teach (not the whole school directory).
                  </li>
                  <li>
                    <strong className="text-foreground">Principal / admin / staff</strong> operate
                    school-wide within their school id.
                  </li>
                </ul>
              </div>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Multi-tenant schools</h2>
              <p className="mt-1">
                Data is scoped by <code className="rounded bg-muted px-1 text-xs">school_id</code>.
                Branding, rosters, grades, and go-live settings belong to that school.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Email &amp; payments honesty</h2>
              <p className="mt-1">
                Until Resend is configured, emails are log-only. Until Intuit OAuth is configured,
                QuickBooks Connect uses a labeled sandbox demo — never silent production billing.
              </p>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Your responsibilities</h2>
              <p className="mt-1">
                Schools should use unique accounts, link parents carefully, and apply database
                migrations for first-class RLS tables. Leadership can track readiness under Principal
                → Go-live.
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="flex flex-wrap justify-center gap-4 text-center text-sm">
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

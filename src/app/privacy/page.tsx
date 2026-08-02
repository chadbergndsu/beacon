import Link from 'next/link'
import { Shield } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

/**
 * Trust page — market buyers (principals) ask FERPA/access questions early.
 * Keep plain language; no legal theater.
 */
export default function PrivacyPage() {
  return (
    <div className="min-h-screen beacon-shell">
      <header className="border-b border-border/80 bg-navy text-navy-foreground">
        <div className="mx-auto max-w-2xl px-4 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5 font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500 text-sm text-white">
              B
            </span>
            Beacon
          </Link>
          <Link href="/login" className="text-sm font-medium text-sky-200 hover:text-white">
            Sign in →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl space-y-6 px-4 py-10">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
            Trust
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-navy dark:text-sky-50">
            Privacy &amp; student data
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed">
            Beacon is built so each school controls its own roster. This page summarizes how access
            works in the product — not a substitute for your school’s legal counsel.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4 text-sm text-muted-foreground leading-relaxed">
            <div className="flex gap-3">
              <Shield className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-foreground">Role-based access</h2>
                <ul className="mt-2 list-disc pl-5 space-y-1">
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
                Data is scoped by <code className="text-xs bg-muted px-1 rounded">school_id</code>.
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

        <p className="text-center text-sm">
          <Link href="/about" className="font-semibold text-sky-700 hover:underline">
            About Beacon
          </Link>
          {' · '}
          <Link href="/school" className="font-semibold text-sky-700 hover:underline">
            School site
          </Link>
        </p>
      </div>
    </div>
  )
}

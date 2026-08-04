import Link from 'next/link'
import { requirePrincipal } from '@/lib/principal'
import { probeOpsHealth } from '@/lib/ops/health'
import { RELEASE_CHECKLIST, loadReleaseChecklistState } from '@/lib/ops/release-checklist'
import { loadSchoolBrand } from '@/lib/school-brand'
import { HealthChecksList } from '@/components/ops/HealthChecksList'
import { ReleaseChecklistForm } from '@/components/ops/ReleaseChecklistForm'
import { SchoolBrandForm } from '@/components/ops/SchoolBrandForm'
import { OnboardingProgress } from '@/components/ops/OnboardingProgress'
import { loadSchoolOnboarding } from '@/lib/ops/onboarding'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export default async function PrincipalReleasePage() {
  const { schoolId } = await requirePrincipal()
  const [health, checklist, brand, onboarding] = await Promise.all([
    probeOpsHealth(schoolId),
    loadReleaseChecklistState(schoolId),
    loadSchoolBrand(schoolId),
    loadSchoolOnboarding(schoolId),
  ])

  const done = RELEASE_CHECKLIST.filter((i) => checklist[i.id]).length
  const total = RELEASE_CHECKLIST.length

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          Ops &amp; trust
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy dark:text-sky-50">
          Go-live for {brand.name}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Finish platform health, label demo vs live integrations, set your school branding, and
          tick the human checklist before wider parent rollout. Beacon works for any school — this
          page is your launch control.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Ready score
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-navy dark:text-sky-50">
              {health.readyScore}
              <span className="text-base font-semibold text-muted-foreground">/100</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Checklist
            </p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-navy dark:text-sky-50">
              {done}
              <span className="text-base font-semibold text-muted-foreground">/{total}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Integration mode
            </p>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant={health.emailLive ? 'success' : 'warning'}>
                Email · {health.emailLive ? 'live' : 'log-only'}
              </Badge>
              <Badge variant={health.qbLiveConfigured ? 'success' : 'sky'}>
                QB · {health.qbLiveConfigured ? 'OAuth ready' : 'demo until keys'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <OnboardingProgress status={onboarding} />

      <Card>
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold text-navy dark:text-sky-50">School branding</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Powers login, public school site, emails, and report cards for this tenant.
          </p>
        </div>
        <CardContent className="pt-5">
          <SchoolBrandForm brand={brand} />
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold text-navy dark:text-sky-50">Automated health</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Probed just now · {new Date(health.generatedAt).toLocaleString()}
          </p>
        </div>
        <CardContent className="pt-5">
          <HealthChecksList checks={health.checks} />
        </CardContent>
      </Card>

      <Card>
        <div className="border-b border-border px-5 py-4">
          <h3 className="font-semibold text-navy dark:text-sky-50">Human checklist</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Saved on your school record — any principal/admin on this school can update.
          </p>
        </div>
        <CardContent className="pt-5">
          <ReleaseChecklistForm items={RELEASE_CHECKLIST} state={checklist} />
        </CardContent>
      </Card>

      <div className="rounded-2xl border border-sky-200 bg-sky-50/60 px-5 py-4 text-sm dark:border-sky-900 dark:bg-sky-950/30">
        <p className="font-semibold text-sky-950 dark:text-sky-100">Next env steps (server)</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sky-900/90 dark:text-sky-200/90">
          <li>
            Apply migrations: <code className="text-xs">npm run db:migrate</code> with{' '}
            <code className="text-xs">DATABASE_URL</code>, or{' '}
            <code className="text-xs">POSTGRES_PASSWORD</code> +{' '}
            <code className="text-xs">SUPABASE_PROJECT_REF</code>
          </li>
          <li>
            Live email: verify domain at resend.com → set{' '}
            <code className="text-xs">RESEND_API_KEY</code> +{' '}
            <code className="text-xs">EMAIL_FROM</code> on Vercel → send test from{' '}
            <Link href="/admin/emails" className="font-semibold underline">
              Comms
            </Link>
          </li>
          <li>
            School contact email on branding above becomes Reply-To so parents can answer the office
          </li>
          <li>
            Live QuickBooks: <code className="text-xs">INTUIT_CLIENT_ID</code> /{' '}
            <code className="text-xs">SECRET</code> / redirect URI
          </li>
          <li>
            Optional principal seed elevation:{' '}
            <code className="text-xs">BEACON_PRINCIPAL_EMAIL=you@yourschool.org</code>
          </li>
        </ul>
        <p className="mt-3">
          <Link href="/admin/emails" className="font-semibold text-sky-800 hover:underline">
            Communications →
          </Link>
          {' · '}
          <Link href="/principal/payments" className="font-semibold text-sky-800 hover:underline">
            QuickBooks →
          </Link>
          {' · '}
          <Link href="/school" className="font-semibold text-sky-800 hover:underline">
            Public school site →
          </Link>
        </p>
      </div>
    </div>
  )
}

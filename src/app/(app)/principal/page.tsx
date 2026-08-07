import { Suspense } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { Link2 } from 'lucide-react'
import { requirePrincipal } from '@/lib/principal'
import { loadBillingState, formatMoney } from '@/lib/billing/store'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadSchoolBeaconSignal } from '@/lib/insights/load-beacon-signal'
import { loadPilotScorecard } from '@/lib/pilot-analytics/scorecard'
import { BeaconSignalCard } from '@/components/insights/BeaconSignalCard'
import { PilotScorecard } from '@/components/principal/PilotScorecard'
import { Badge } from '@/components/ui/badge'
import { Button, buttonClassName } from '@/components/ui/button'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { ConfigurableView } from '@/components/view-prefs/ConfigurableView'
import { ViewSection } from '@/components/view-prefs/ViewSection'
import { loadScreenLayout } from '@/lib/view-prefs/store'
import { isOfficeAdmin } from '@/lib/roles'
import { measureServerOperation } from '@/lib/ops/server-performance'

const OFFICE_ADMIN_TASKS = [
  {
    href: '/principal/roster',
    label: 'Roster',
    hint: 'Classes, students, enrollments',
  },
  {
    href: '/announcements/new',
    label: 'Announcement',
    hint: 'Post news to families',
  },
  {
    href: '/principal/invoices',
    label: 'Invoices',
    hint: 'Tuition and family billing',
  },
  {
    href: '/principal/badges',
    label: 'Badges',
    hint: 'Kiosk, RFID, attendance',
  },
  {
    href: '/admin/emails',
    label: 'Comms',
    hint: 'Email outbox, Slack test',
  },
  {
    href: '/principal/release',
    label: 'Go-live',
    hint: 'Brand, Craft room map, checklist',
  },
  {
    href: '/craft',
    label: 'Craft',
    hint: 'Campus twin and presence',
  },
] as const

type BillingResult = Awaited<ReturnType<typeof loadBillingState>>
type SignalResult = Awaited<ReturnType<typeof loadSchoolBeaconSignal>>
type ScorecardResult = Awaited<ReturnType<typeof loadPilotScorecard>>

async function loadSchoolSummary(schoolId: string) {
  const admin = createAdminClient()
  return Promise.all([
    admin
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('active', true),
    admin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('active', true),
    admin
      .from('announcements')
      .select('id, title, published_at')
      .eq('school_id', schoolId)
      .order('published_at', { ascending: false })
      .limit(3),
  ])
}

type SchoolSummaryResult = Awaited<ReturnType<typeof loadSchoolSummary>>

function PrincipalCardFallback({ label, height = 'h-36' }: { label: string; height?: string }) {
  return (
    <div
      role="status"
      aria-label={`Loading ${label}`}
      className={`${height} animate-pulse rounded-xl border border-border bg-card p-4`}
    >
      <div className="h-4 w-36 rounded bg-muted" />
      <div className="mt-4 h-3 w-3/4 rounded bg-muted" />
      <span className="sr-only">Loading {label}…</span>
    </div>
  )
}

async function PrincipalSignal({ signalPromise }: { signalPromise: Promise<SignalResult> }) {
  return <BeaconSignalCard signal={await signalPromise} />
}

export async function PrincipalPilotEvidence({
  scorecardPromise,
}: {
  scorecardPromise: Promise<ScorecardResult>
}) {
  return <PilotScorecard scorecard={await scorecardPromise} />
}

async function PrincipalStats({
  billingPromise,
  summaryPromise,
}: {
  billingPromise: Promise<BillingResult>
  summaryPromise: Promise<SchoolSummaryResult>
}) {
  const [billing, [{ count: classCount }, { count: studentCount }]] = await Promise.all([
    billingPromise,
    summaryPromise,
  ])
  const openCents = billing.invoices
    .filter((invoice) => invoice.status === 'open' || invoice.status === 'overdue')
    .reduce((sum, invoice) => sum + invoice.amountCents, 0)
  const paidCents = billing.payments
    .filter((payment) => payment.status === 'succeeded')
    .reduce((sum, payment) => sum + payment.amountCents, 0)

  return (
    <Table>
      <THead>
        <TR>
          <TH>Metric</TH>
          <TH className="text-right">Value</TH>
        </TR>
      </THead>
      <TBody>
        <TR>
          <TD>Active classes</TD>
          <TD className="text-right tabular-nums font-medium">{classCount ?? 0}</TD>
        </TR>
        <TR>
          <TD>Students</TD>
          <TD className="text-right tabular-nums font-medium">{studentCount ?? 0}</TD>
        </TR>
        <TR>
          <TD>Open tuition</TD>
          <TD className="text-right tabular-nums font-medium">{formatMoney(openCents)}</TD>
        </TR>
        <TR>
          <TD>Payments collected</TD>
          <TD className="text-right tabular-nums font-medium">{formatMoney(paidCents)}</TD>
        </TR>
      </TBody>
    </Table>
  )
}

async function PrincipalQuickBooks({
  billingPromise,
}: {
  billingPromise: Promise<BillingResult>
}) {
  const qb = (await billingPromise).quickbooks
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          QuickBooks
        </div>
        <Badge
          variant={
            qb.status === 'connected'
              ? 'success'
              : qb.status === 'demo'
                ? 'warning'
                : qb.status === 'error'
                  ? 'danger'
                  : 'warning'
          }
        >
          {qb.status}
        </Badge>
      </div>
      <div className="space-y-2 px-3 py-3 text-[13px] text-muted-foreground">
        {qb.status === 'connected' ? (
          <>
            <p className="text-sm text-muted-foreground">
              Connected to <strong className="text-foreground">{qb.companyName || 'QuickBooks'}</strong>
              {qb.environment === 'sandbox' ? (
                <Badge variant="sky" className="ml-2">Sandbox</Badge>
              ) : null}
            </p>
            <p className="text-xs text-muted-foreground">
              Last sync: {qb.lastSyncAt ? new Date(qb.lastSyncAt).toLocaleString() : 'Not yet'}
            </p>
          </>
        ) : qb.status === 'demo' ? (
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">Demo mode</strong> — not live QuickBooks. Add INTUIT credentials for real OAuth.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Connect QuickBooks Online so tuition invoices and payments sync to your books — customers, invoices, and payment records.
          </p>
        )}
        <Link href="/principal/payments">
          <Button variant="primary" size="sm">
            {qb.status === 'connected' || qb.status === 'demo' ? 'Manage connection' : 'Set up payments'}
          </Button>
        </Link>
      </div>
    </div>
  )
}

async function PrincipalAnnouncements({
  summaryPromise,
}: {
  summaryPromise: Promise<SchoolSummaryResult>
}) {
  const [, , { data: announcements }] = await summaryPromise
  return (
    <div className="space-y-2">
      {!announcements?.length ? (
        <p className="text-[13px] text-muted-foreground">No announcements yet.</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Title</TH>
              <TH className="text-right">Published</TH>
            </TR>
          </THead>
          <TBody>
            {announcements.map((announcement) => (
              <TR key={announcement.id}>
                <TD>
                  <Link href={`/announcements/${announcement.id}`} className="font-medium text-foreground hover:text-primary hover:underline">
                    {announcement.title}
                  </Link>
                </TD>
                <TD className="text-right text-[12px] text-muted-foreground">
                  {announcement.published_at ? format(new Date(announcement.published_at), 'MMM d, yyyy') : '—'}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
      <div className="flex gap-2 pt-1">
        <Link href="/announcements/new" className={buttonClassName('outline', 'sm')}>New announcement</Link>
        <Link href="/dashboard" className={buttonClassName('ghost', 'sm')}>Dashboard</Link>
      </div>
    </div>
  )
}

export default async function PrincipalOverviewPage() {
  const { schoolId, user, profile } = await requirePrincipal()
  const officeAdmin = isOfficeAdmin(profile.role)
  const defaultLayout = officeAdmin
    ? [
        'daily_tasks',
        'beacon_signal',
        'pilot_evidence',
        'stats',
        'quickbooks',
        'announcements',
        'shortcuts',
      ]
    : [
        'beacon_signal',
        'pilot_evidence',
        'stats',
        'quickbooks',
        'announcements',
        'shortcuts',
      ]

  const billingPromise = measureServerOperation('principal.billing', () => loadBillingState(schoolId))
  const signalPromise = measureServerOperation('principal.signal', () => loadSchoolBeaconSignal(schoolId))
  const scorecardPromise = measureServerOperation('principal.scorecard', () => loadPilotScorecard(schoolId))
  const schoolSummaryPromise = measureServerOperation('principal.summary', () => loadSchoolSummary(schoolId))
  const viewLayout = await measureServerOperation('principal.layout', () =>
    loadScreenLayout(user.id, 'principal_overview', defaultLayout)
  )
  return (
    <ConfigurableView screenId="principal_overview" initialLayout={viewLayout}>
      {officeAdmin ? (
        <ViewSection id="daily_tasks" title="Daily tasks" description="Most-used office updates">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {OFFICE_ADMIN_TASKS.map((task) => (
              <Link
                key={task.href}
                href={task.href}
                className="rounded-lg border border-border bg-card px-3 py-3 transition hover:border-primary/40 hover:bg-muted/30"
              >
                <p className="text-sm font-semibold text-foreground">{task.label}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{task.hint}</p>
              </Link>
            ))}
          </div>
        </ViewSection>
      ) : null}
      <ViewSection id="beacon_signal" title="Beacon Signal">
        <Suspense fallback={<PrincipalCardFallback label="Beacon Signal" />}>
          <PrincipalSignal signalPromise={signalPromise} />
        </Suspense>
      </ViewSection>

      <ViewSection
        id="pilot_evidence"
        title="Pilot evidence"
        description="Seven-day activity, delivery, and parent feedback signals"
      >
        <Suspense fallback={<PrincipalCardFallback label="pilot evidence" height="h-64" />}>
          <PrincipalPilotEvidence scorecardPromise={scorecardPromise} />
        </Suspense>
      </ViewSection>

      <ViewSection id="stats" title="School stats">
        <Suspense fallback={<PrincipalCardFallback label="school stats" />}>
          <PrincipalStats billingPromise={billingPromise} summaryPromise={schoolSummaryPromise} />
        </Suspense>
      </ViewSection>

      <ViewSection id="quickbooks" title="QuickBooks card">
        <Suspense fallback={<PrincipalCardFallback label="QuickBooks" />}>
          <PrincipalQuickBooks billingPromise={billingPromise} />
        </Suspense>
      </ViewSection>

      <ViewSection id="announcements" title="Recent announcements">
        <Suspense fallback={<PrincipalCardFallback label="announcements" />}>
          <PrincipalAnnouncements summaryPromise={schoolSummaryPromise} />
        </Suspense>
      </ViewSection>

      <ViewSection id="shortcuts" title="Office shortcuts">
        <div className="flex flex-wrap gap-2">
          <Link href="/principal/videos" className={buttonClassName('outline', 'sm')}>
            Videos
          </Link>
          <Link href="/principal/pulse" className={buttonClassName('outline', 'sm')}>
            Pulse board
          </Link>
          <Link href="/principal/release" className={buttonClassName('outline', 'sm')}>
            Go-live
          </Link>
          <Link href="/craft" className={buttonClassName('outline', 'sm')}>
            Craft
          </Link>
          <Link href="/principal/roster" className={buttonClassName('outline', 'sm')}>
            Roster
          </Link>
        </div>
      </ViewSection>
    </ConfigurableView>
  )
}

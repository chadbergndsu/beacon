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

export default async function PrincipalOverviewPage() {
  const { schoolId, user, profile } = await requirePrincipal()
  const officeAdmin = isOfficeAdmin(profile.role)
  const admin = createAdminClient()
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

  const billingPromise = loadBillingState(schoolId)
  const signalPromise = loadSchoolBeaconSignal(schoolId)
  const scorecardPromise = loadPilotScorecard(schoolId)
  const schoolSummaryPromise = Promise.all([
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
  const viewLayoutPromise = loadScreenLayout(user.id, 'principal_overview', defaultLayout)

  const [
    billing,
    signal,
    scorecard,
    [{ count: classCount }, { count: studentCount }, { data: announcements }],
    viewLayout,
  ] = await Promise.all([
    billingPromise,
    signalPromise,
    scorecardPromise,
    schoolSummaryPromise,
    viewLayoutPromise,
  ])

  const openInvoices = billing.invoices.filter((i) => i.status === 'open' || i.status === 'overdue')
  const paidCents = billing.payments
    .filter((p) => p.status === 'succeeded')
    .reduce((s, p) => s + p.amountCents, 0)
  const openCents = openInvoices.reduce((s, i) => s + i.amountCents, 0)

  const qb = billing.quickbooks
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
        <BeaconSignalCard signal={signal} />
      </ViewSection>

      <ViewSection
        id="pilot_evidence"
        title="Pilot evidence"
        description="Seven-day activity, delivery, and parent feedback signals"
      >
        <PilotScorecard scorecard={scorecard} />
      </ViewSection>

      <ViewSection id="stats" title="School stats">
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
      </ViewSection>

      <ViewSection id="quickbooks" title="QuickBooks card">
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
                  Connected to{' '}
                  <strong className="text-foreground">{qb.companyName || 'QuickBooks'}</strong>
                  {qb.environment === 'sandbox' && (
                    <Badge variant="sky" className="ml-2">
                      Sandbox
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  Last sync:{' '}
                  {qb.lastSyncAt ? new Date(qb.lastSyncAt).toLocaleString() : 'Not yet'}
                </p>
              </>
            ) : qb.status === 'demo' ? (
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Demo mode</strong> — not live QuickBooks. Add
                INTUIT credentials for real OAuth.
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect QuickBooks Online so tuition invoices and payments sync to your books —
                customers, invoices, and payment records.
              </p>
            )}
            <Link href="/principal/payments">
              <Button variant="primary" size="sm">
                {qb.status === 'connected' || qb.status === 'demo'
                  ? 'Manage connection'
                  : 'Set up payments'}
              </Button>
            </Link>
          </div>
        </div>
      </ViewSection>

      <ViewSection id="announcements" title="Recent announcements">
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
                {announcements.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <Link
                        href={`/announcements/${a.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {a.title}
                      </Link>
                    </TD>
                    <TD className="text-right text-[12px] text-muted-foreground">
                      {a.published_at
                        ? format(new Date(a.published_at), 'MMM d, yyyy')
                        : '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          <div className="flex gap-2 pt-1">
            <Link href="/announcements/new" className={buttonClassName('outline', 'sm')}>
              New announcement
            </Link>
            <Link href="/dashboard" className={buttonClassName('ghost', 'sm')}>
              Dashboard
            </Link>
          </div>
        </div>
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

import Link from 'next/link'
import {
  BookOpen,
  CreditCard,
  Link2,
  Receipt,
  Shield,
} from 'lucide-react'
import { requirePrincipal } from '@/lib/principal'
import { loadBillingState, formatMoney } from '@/lib/billing/store'
import { createAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function PrincipalOverviewPage() {
  const { schoolId, profile } = await requirePrincipal()
  const admin = createAdminClient()
  const billing = await loadBillingState(schoolId)

  const [{ count: classCount }, { count: studentCount }, { data: announcements }] =
    await Promise.all([
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

  const openInvoices = billing.invoices.filter((i) => i.status === 'open' || i.status === 'overdue')
  const paidCents = billing.payments
    .filter((p) => p.status === 'succeeded')
    .reduce((s, p) => s + p.amountCents, 0)
  const openCents = openInvoices.reduce((s, i) => s + i.amountCents, 0)

  const qb = billing.quickbooks

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active classes', value: String(classCount ?? 0), icon: BookOpen },
          { label: 'Students', value: String(studentCount ?? 0), icon: Shield },
          { label: 'Open tuition', value: formatMoney(openCents), icon: Receipt },
          { label: 'Payments collected', value: formatMoney(paidCents), icon: CreditCard },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-5 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="text-2xl font-bold tabular-nums text-navy dark:text-sky-50 mt-0.5">
                  {s.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="border-b border-border bg-muted/30 px-5 py-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-sky-600" />
              <h2 className="font-semibold text-navy dark:text-sky-50">QuickBooks</h2>
            </div>
            <Badge
              variant={
                qb.status === 'connected'
                  ? 'success'
                  : qb.status === 'error'
                    ? 'danger'
                    : 'warning'
              }
            >
              {qb.status}
            </Badge>
          </div>
          <CardContent className="pt-5 space-y-3">
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
            ) : (
              <p className="text-sm text-muted-foreground">
                Connect QuickBooks Online so tuition invoices and payments sync to your books —
                customers, invoices, and payment records.
              </p>
            )}
            <Link href="/principal/payments">
              <Button variant="primary" size="md">
                {qb.status === 'connected' ? 'Manage connection' : 'Set up payments'}
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <div className="border-b border-border bg-muted/30 px-5 py-4">
            <h2 className="font-semibold text-navy dark:text-sky-50">Recent announcements</h2>
          </div>
          <CardContent className="pt-4">
            {!announcements?.length ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              <ul className="space-y-2">
                {announcements.map((a) => (
                  <li key={a.id}>
                    <Link
                      href={`/announcements/${a.id}`}
                      className="text-sm font-medium text-sky-800 hover:underline dark:text-sky-300"
                    >
                      {a.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 flex gap-2">
              <Link href="/announcements/new">
                <Button variant="outline" size="sm">
                  New announcement
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  School dashboard
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-dashed border-sky-200 bg-sky-50/40 dark:bg-sky-950/20">
          <CardContent className="pt-5 text-sm text-muted-foreground leading-relaxed">
            <p>
              <strong className="text-foreground">Principal layer</strong> is exclusive to{' '}
              {profile.full_name || 'you'}. Beacon is the full school suite: teachers run classes,
              families get clarity, and you run the office — including QuickBooks-linked tuition.
            </p>
          </CardContent>
        </Card>
        <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-950/20 dark:border-violet-800">
          <CardContent className="pt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold text-navy dark:text-sky-50">Coffee break</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Private Tetris — principal only. No teachers. No parents. No judgment.
              </p>
            </div>
            <Link href="/principal/break">
              <Button size="md">Play Beacon Blocks</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

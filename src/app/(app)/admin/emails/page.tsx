import Link from 'next/link'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { Mail, Radio, ShieldCheck, AlertTriangle } from 'lucide-react'
import { SystemEmailForm } from '@/components/announcements/SystemEmailForm'
import { ComposeMessageForm } from '@/components/comms/ComposeMessageForm'
import { TestEmailButton } from '@/components/comms/TestEmailButton'
import { TestSlackButton } from '@/components/comms/TestSlackButton'
import { ResendEmailButton } from '@/components/comms/ResendEmailButton'
import { ConfigurableView } from '@/components/view-prefs/ConfigurableView'
import { ViewSection } from '@/components/view-prefs/ViewSection'
import { getProfile } from '@/lib/auth'
import { getEmailDeliveryStats, isEmailLive, listEmailOutbox } from '@/lib/email/send'
import { loadSchoolBrand } from '@/lib/school-brand'
import { canSendSystemEmail } from '@/lib/roles'
import { isSlackConfigured, slackConfigMode } from '@/lib/notify/slack'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadScreenLayout } from '@/lib/view-prefs/store'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

export default async function CommunicationsPage() {
  const { profile, user } = await getProfile()
  if (!profile || !['admin', 'staff', 'teacher', 'principal'].includes(profile.role)) {
    redirect('/dashboard')
  }
  // Fail closed: never list outbox/classes without tenant
  if (!profile.school_id) {
    redirect('/dashboard')
  }
  const schoolId = profile.school_id

  const [emails, stats, brand] = await Promise.all([
    listEmailOutbox(schoolId, 100),
    getEmailDeliveryStats(schoolId),
    loadSchoolBrand(schoolId),
  ])

  const admin = createAdminClient()
  let classes: { id: string; name: string }[] = []
  if (profile.role === 'teacher') {
    const { data } = await admin
      .from('classes')
      .select('id, name')
      .eq('teacher_id', profile.id)
      .eq('school_id', schoolId)
      .order('name')
    classes = data ?? []
  } else {
    const { data } = await admin
      .from('classes')
      .select('id, name')
      .eq('school_id', schoolId)
      .order('name')
    classes = data ?? []
  }

  const canManual = canSendSystemEmail(profile.role)
  const live = isEmailLive()
  const replyTo = brand.email || process.env.EMAIL_REPLY_TO || null
  const slackOn = isSlackConfigured()
  const slackMode = slackConfigMode()

  const viewLayout = await loadScreenLayout(user.id, 'admin_comms', [
    'header',
    'test_email',
    ...(canManual ? (['test_slack'] as const) : []),
    'compose',
    ...(canManual ? (['tips'] as const) : []),
    'outbox',
  ])

  return (
    <ConfigurableView screenId="admin_comms" initialLayout={viewLayout}>
      <ViewSection id="header" title="Comms header" locked>
        <PageHeader
          eyebrow="Communications"
          title="Reach families — and know it landed"
          description={
            <>
              Schools hated the last system because messages disappeared into a black hole. Beacon
              composes, brands as <strong>{brand.name}</strong>, logs every send, and lets you resend
              failures. Live delivery uses Resend when configured. Use <strong>Edit view</strong> to
              hide sections you rarely need.
            </>
          }
        />
      </ViewSection>

      <ViewSection id="test_email" title="Test email">
        <div
          className={
            live
              ? 'rounded-lg border border-emerald-200 bg-emerald-50/90 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100'
              : 'rounded-lg border border-amber-200 bg-amber-50/90 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100'
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              {live ? (
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              ) : (
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              )}
              <div>
                <p className="font-semibold">
                  {live ? 'Live delivery (Resend)' : 'Log-only mode — not yet reaching inboxes'}
                </p>
                <p className="mt-1 text-xs opacity-90 leading-relaxed">
                  From: <code className="rounded bg-black/5 px-1">{stats.fromAddress}</code>
                  {replyTo ? (
                    <>
                      {' '}
                      · Reply-To: <code className="rounded bg-black/5 px-1">{replyTo}</code>
                    </>
                  ) : (
                    <>
                      {' '}
                      · Reply-To: set school contact email on{' '}
                      <Link href="/principal/release" className="font-semibold underline">
                        Go-live
                      </Link>
                    </>
                  )}
                </p>
                {!live && (
                  <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs">
                    <li>
                      Create account at{' '}
                      <a
                        className="font-semibold underline"
                        href="https://resend.com"
                        target="_blank"
                        rel="noreferrer"
                      >
                        resend.com
                      </a>{' '}
                      → Domains → add &amp; verify your school domain (DNS)
                    </li>
                    <li>
                      Vercel project → Settings → Environment Variables →{' '}
                      <code>RESEND_API_KEY=re_…</code> (Production)
                    </li>
                    <li>
                      Set{' '}
                      <code>
                        EMAIL_FROM={brand.shortName} &lt;office@yourschool.org&gt;
                      </code>{' '}
                      (must match verified domain)
                    </li>
                    <li>Redeploy, then hit “Send live test” below</li>
                  </ol>
                )}
              </div>
            </div>
            <TestEmailButton emailLive={live} toHint={profile.email} />
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'In outbox', value: stats.total, icon: Mail },
            { label: 'Sent', value: stats.sent, tone: 'ok' as const },
            { label: 'Failed', value: stats.failed, tone: 'bad' as const },
            { label: 'Log-only', value: stats.skipped, tone: 'warn' as const },
            { label: 'Last 24h', value: stats.last24h, icon: Radio },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-4">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {s.label}
                </p>
                <p
                  className={
                    s.tone === 'ok'
                      ? 'mt-1 text-2xl font-bold tabular-nums text-emerald-700'
                      : s.tone === 'bad'
                        ? 'mt-1 text-2xl font-bold tabular-nums text-red-700'
                        : s.tone === 'warn'
                          ? 'mt-1 text-2xl font-bold tabular-nums text-amber-700'
                          : 'mt-1 text-2xl font-semibold tabular-nums text-foreground'
                  }
                >
                  {s.value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ViewSection>

      {canManual ? (
        <ViewSection id="test_slack" title="Slack">
          <div
            className={
              slackOn
                ? 'rounded-lg border border-violet-200 bg-violet-50/80 p-4 text-sm text-violet-950 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-100'
                : 'rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground'
            }
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">
                  {slackOn
                    ? `Slack connected (${slackMode === 'bot' ? 'bot API' : 'incoming webhook'})`
                    : 'Slack office channel (optional)'}
                </p>
                <p className="mt-1 text-xs leading-relaxed opacity-90">
                  {slackOn
                    ? 'New announcements and pilot suggestions can post to your office Slack. Use the test button to confirm delivery.'
                    : 'Set BEACON_SLACK_WEBHOOK_URL on Vercel (Incoming Webhook from a Slack channel), or BEACON_SLACK_BOT_TOKEN + BEACON_SLACK_CHANNEL.'}
                </p>
              </div>
              <TestSlackButton
                slackConfigured={slackOn}
                modeHint={slackMode}
              />
            </div>
          </div>
        </ViewSection>
      ) : null}

      <ViewSection id="compose" title="Compose message">
        <Card>
          <CardContent className="pt-6">
            <ComposeMessageForm classes={classes} canSchoolWide={canManual} />
          </CardContent>
        </Card>
      </ViewSection>

      {canManual ? (
        <ViewSection id="tips" title="Delivery tips">
          <Card>
            <CardContent className="pt-6">
              <SystemEmailForm />
              <p className="mt-3 text-xs text-muted-foreground">
                One-off to a single address. For class or school-wide, use Compose above or{' '}
                <Link
                  href="/announcements/new"
                  className="font-medium text-primary hover:underline"
                >
                  Announcements
                </Link>
                .
              </p>
            </CardContent>
          </Card>
        </ViewSection>
      ) : null}

      <ViewSection id="outbox" title="Email outbox">
      <section>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-[13px] font-medium text-foreground">
              Outbox · recent messages ({emails.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Every announcement, digest, grade notice, and compose is recorded here.
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={live ? 'success' : 'warning'}>
              {live ? 'Resend live' : 'Log-only'}
            </Badge>
            <Link
              href="/announcements/new"
              className="text-xs font-medium text-primary hover:underline"
            >
              New announcement →
            </Link>
          </div>
        </div>

        {emails.length === 0 ? (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">
            No emails yet. Compose a family message, publish an announcement with “Email
            recipients”, email a Dinner Table Digest from a student page, or send a test above.
          </p>
        ) : (
          <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>When</TH>
                  <TH>To</TH>
                  <TH>Subject</TH>
                  <TH>Kind</TH>
                  <TH>Status</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {emails.map((e) => (
                  <TR key={e.id} className="align-top">
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {e.created_at ? format(new Date(e.created_at), 'MMM d · h:mm a') : '—'}
                    </TD>
                    <TD>
                      <div className="font-medium">{e.to_email}</div>
                      {e.to_name ? (
                        <div className="text-xs text-muted-foreground">{e.to_name}</div>
                      ) : null}
                    </TD>
                    <TD className="max-w-[240px]">
                      <div className="truncate" title={e.subject}>
                        {e.subject}
                      </div>
                      {e.related_id && e.related_table === 'announcements' ? (
                        <Link
                          href={`/announcements/${e.related_id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View announcement
                        </Link>
                      ) : null}
                      {e.related_id && e.related_table === 'students' ? (
                        <Link
                          href={`/students/${e.related_id}`}
                          className="text-xs text-primary hover:underline"
                        >
                          View student
                        </Link>
                      ) : null}
                      {e.error ? (
                        <div className="mt-1 line-clamp-2 text-xs text-warning">{e.error}</div>
                      ) : null}
                    </TD>
                    <TD className="whitespace-nowrap text-muted-foreground">
                      {e.kind.replace(/_/g, ' ')}
                    </TD>
                    <TD>
                      <span
                        className={
                          e.status === 'sent'
                            ? 'font-medium text-success'
                            : e.status === 'failed'
                              ? 'font-medium text-danger'
                              : 'font-medium text-warning'
                        }
                      >
                        {e.status}
                      </span>
                      {e.provider ? (
                        <div className="text-[11px] text-muted-foreground">{e.provider}</div>
                      ) : null}
                    </TD>
                    <TD>
                      {canManual && (e.status === 'failed' || e.status === 'skipped') ? (
                        <ResendEmailButton outboxId={e.id} />
                      ) : null}
                    </TD>
                  </TR>
                ))}
              </TBody>
          </Table>
        )}
      </section>
      </ViewSection>
    </ConfigurableView>
  )
}

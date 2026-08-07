import Link from 'next/link'
import { format } from 'date-fns'
import { redirect } from 'next/navigation'
import { SystemEmailForm } from '@/components/announcements/SystemEmailForm'
import { ComposeMessageForm } from '@/components/comms/ComposeMessageForm'
import { TestEmailButton } from '@/components/comms/TestEmailButton'
import { ResendEmailButton } from '@/components/comms/ResendEmailButton'
import { InboxRepliesPanel } from '@/components/comms/InboxRepliesPanel'
import { DeskHero } from '@/components/comms/DeskHero'
import { ConfigurableView } from '@/components/view-prefs/ConfigurableView'
import { ViewSection } from '@/components/view-prefs/ViewSection'
import { getProfile } from '@/lib/auth'
import { getEmailDeliveryStats, isEmailLive, listEmailOutbox } from '@/lib/email/send'
import { countUnreadInbox, listEmailInbox } from '@/lib/email/inbound'
import { isEmailInboundConfigured } from '@/lib/email/reply-routing'
import { buildDeskBrief, kindLabel } from '@/lib/comms/desk'
import { loadSchoolBrand } from '@/lib/school-brand'
import { canSendSystemEmail } from '@/lib/roles'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadScreenLayout } from '@/lib/view-prefs/store'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'

export default async function FamilyDeskPage() {
  const { profile, user } = await getProfile()
  if (!profile || !['admin', 'staff', 'teacher', 'principal'].includes(profile.role)) {
    redirect('/dashboard')
  }
  if (!profile.school_id) {
    redirect('/dashboard')
  }
  const schoolId = profile.school_id

  const [emails, stats, brand, inbox, unreadInbox] = await Promise.all([
    listEmailOutbox(schoolId, 100),
    getEmailDeliveryStats(schoolId),
    loadSchoolBrand(schoolId),
    listEmailInbox(schoolId, 40),
    countUnreadInbox(schoolId),
  ])

  const brief = buildDeskBrief({ inbox, outbox: emails })
  // Prefer live unread count from head query when available
  brief.unreadReplies = unreadInbox || brief.unreadReplies

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
  const inboundOn = isEmailInboundConfigured()

  const viewLayout = await loadScreenLayout(user.id, 'admin_comms', [
    'header',
    'inbox',
    'compose',
    'test_email',
    ...(canManual ? (['tips'] as const) : []),
    'outbox',
  ])

  return (
    <ConfigurableView screenId="admin_comms" initialLayout={viewLayout}>
      <ViewSection id="header" title="Family Desk" locked>
        <DeskHero
          schoolName={brand.name || 'Your school'}
          brief={brief}
          inboundOn={inboundOn}
          canSimulate={canManual}
        />
      </ViewSection>

      <ViewSection id="inbox" title="Family replies">
        <section id="desk-inbox" className="scroll-mt-24">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-medium text-foreground">
                Replies waiting
                {brief.unreadReplies > 0 ? (
                  <span className="ml-2 text-warning">· {brief.unreadReplies} new</span>
                ) : null}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Parent replies to system email land here — threaded to the original note when the
                reply-token matches.
              </p>
            </div>
          </div>
          <InboxRepliesPanel items={inbox} canReply={canManual} />
        </section>
      </ViewSection>

      <ViewSection id="compose" title="Compose">
        <ComposeMessageForm
          classes={classes}
          canSchoolWide={canManual}
          schoolShortName={brand.shortName || brand.name || 'School'}
        />
      </ViewSection>

      <ViewSection id="test_email" title="Delivery pulse">
        <div
          className={
            live
              ? 'rounded-xl border border-emerald-200/80 bg-success-soft/70 p-4 text-sm'
              : 'rounded-xl border border-amber-200/80 bg-warning-soft/70 p-4 text-sm'
          }
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-foreground">
                {live ? 'Live delivery' : 'Log-only — configure Resend/SMTP to reach inboxes'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                From <code className="rounded bg-black/5 px-1">{stats.fromAddress}</code>
                {' · '}
                {stats.sent} sent · {stats.failed} failed · {stats.last24h} in 24h
              </p>
            </div>
            <TestEmailButton emailLive={live} toHint={profile.email} />
          </div>
        </div>
      </ViewSection>

      {canManual ? (
        <ViewSection id="tips" title="One-off">
          <Card>
            <CardContent className="pt-6">
              <SystemEmailForm />
              <p className="mt-3 text-xs text-muted-foreground">
                Single address only. For class or school-wide use Compose, or{' '}
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

      <ViewSection id="outbox" title="Outbox">
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-[13px] font-medium text-foreground">
                Outbox · every note logged ({emails.length})
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Announcements, digests, grade notices, and Desk compose — all here.
              </p>
            </div>
            <Badge variant={live ? 'success' : 'warning'}>
              {live ? 'Resend live' : 'Log-only'}
            </Badge>
          </div>

          {emails.length === 0 ? (
            <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
              No notes yet. Start with an intention above, or send a delivery test.
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
                      {kindLabel(e.kind)}
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

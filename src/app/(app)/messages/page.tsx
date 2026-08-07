import Link from 'next/link'
import { redirect } from 'next/navigation'
import { format } from 'date-fns'
import { getProfile } from '@/lib/auth'
import { listFamilyThreadForEmail } from '@/lib/email/inbound'
import { PageHeader } from '@/components/ui/page-header'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function FamilyMessagesPage() {
  const { profile, user } = await getProfile()
  if (!profile || profile.role !== 'parent') {
    redirect('/dashboard')
  }
  if (!profile.school_id || !user.email) {
    redirect('/dashboard')
  }

  const thread = await listFamilyThreadForEmail(profile.school_id, user.email, 50)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        eyebrow="Family messages"
        title="Your conversation with the school"
        description={
          <>
            Messages the school emailed you — and your replies — are logged here. Reply from your
            email inbox; Beacon captures them automatically when inbound mail is configured.
          </>
        }
      />

      <p className="text-sm text-muted-foreground">
        Prefer the full school picture?{' '}
        <Link href="/dashboard" className="font-medium text-primary hover:underline">
          Back to home
        </Link>
      </p>

      {thread.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No messages yet. When the school emails you (announcements, grades, attendance, or
            office notes), they will show up here. Reply to those emails and your response is
            logged for the office.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {thread.map((m) => (
            <li key={m.id}>
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={m.direction === 'out' ? 'muted' : 'success'}>
                      {m.direction === 'out' ? 'From school' : 'Your reply'}
                    </Badge>
                    {m.kind ? (
                      <span className="text-[11px] text-muted-foreground">
                        {m.kind.replace(/_/g, ' ')}
                      </span>
                    ) : null}
                    <time className="ml-auto text-xs text-muted-foreground">
                      {format(new Date(m.created_at), 'MMM d · h:mm a')}
                    </time>
                  </div>
                  <p className="mt-2 font-medium text-foreground">{m.subject}</p>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                    {m.body_text.slice(0, 2500)}
                    {m.body_text.length > 2500 ? '…' : ''}
                  </pre>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

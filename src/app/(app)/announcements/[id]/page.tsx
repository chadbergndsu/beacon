import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { listEmailOutbox } from '@/lib/email/send'

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { profile } = await getProfile()
  const admin = createAdminClient()

  const { data: a } = await admin
    .from('announcements')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!a) notFound()

  if (profile?.role === 'parent' && a.audience !== 'parents' && a.audience !== 'all') {
    notFound()
  }

  let authorName: string | null = null
  if (a.author_id) {
    const { data: author } = await admin
      .from('profiles')
      .select('full_name, email')
      .eq('id', a.author_id)
      .maybeSingle()
    authorName = author?.full_name || author?.email || null
  }

  let className: string | null = null
  if (a.class_id) {
    const { data: klass } = await admin
      .from('classes')
      .select('name')
      .eq('id', a.class_id)
      .maybeSingle()
    className = klass?.name ?? null
  }

  const canSeeEmails =
    profile && ['admin', 'staff', 'teacher'].includes(profile.role)

  let relatedEmails: Awaited<ReturnType<typeof listEmailOutbox>> = []
  if (canSeeEmails) {
    const all = await listEmailOutbox(profile.school_id, 100)
    relatedEmails = all.filter((e) => e.related_id === id)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          <Link href="/announcements" className="hover:underline">
            Announcements
          </Link>
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{a.title}</h1>
        <p className="text-sm text-muted-foreground mt-2">
          {a.published_at ? format(new Date(a.published_at), 'MMMM d, yyyy · h:mm a') : ''}
          {authorName ? ` · ${authorName}` : ''}
          {className ? ` · ${className}` : ''}
          {' · '}
          <span className="uppercase text-xs font-semibold tracking-wide">{a.audience}</span>
        </p>
      </div>

      <div className="rounded-xl border bg-background p-6 whitespace-pre-wrap text-sm leading-relaxed">
        {a.body}
      </div>

      {canSeeEmails && (
        <section className="rounded-xl border bg-background p-4">
          <h2 className="font-semibold mb-2">System emails for this announcement</h2>
          {relatedEmails.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No emails recorded (posted without email, or outbox not available yet).
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {relatedEmails.map((e) => (
                <li key={e.id} className="flex flex-wrap justify-between gap-2 border-b last:border-0 py-2">
                  <span>
                    <span className="font-medium">{e.to_email}</span>
                    {e.to_name ? ` · ${e.to_name}` : ''}
                  </span>
                  <span
                    className={
                      e.status === 'sent'
                        ? 'text-emerald-700'
                        : e.status === 'failed'
                          ? 'text-red-700'
                          : 'text-amber-700'
                    }
                  >
                    {e.status}
                    {e.provider ? ` · ${e.provider}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}

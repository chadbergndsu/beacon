import Link from 'next/link'
import { format } from 'date-fns'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { buttonClassName } from '@/components/ui/button'
import { PageHeader } from '@/components/ui/page-header'

export default async function AnnouncementsPage() {
  const { profile, user } = await getProfile()
  const admin = createAdminClient()
  const canPost =
    profile && ['admin', 'staff', 'teacher', 'principal'].includes(profile.role)

  // Fail closed: no school_id → empty list (never unscoped multi-tenant query)
  if (!profile?.school_id) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950">
        <h1 className="text-xl font-bold">No school on your profile</h1>
        <p className="mt-2">Ask an administrator to assign your account to a school.</p>
      </div>
    )
  }

  const { data: rows } = await admin
    .from('announcements')
    .select('id, title, body, audience, class_id, author_id, published_at, school_id')
    .eq('school_id', profile.school_id)
    .order('published_at', { ascending: false })
    .limit(50)

  const announcements = rows ?? []

  // Parents: only parents/all audiences (and optionally their classes later)
  const visible =
    profile?.role === 'parent'
      ? announcements.filter((a) => a.audience === 'parents' || a.audience === 'all')
      : announcements

  return (
    <div className="page-stack">
      <PageHeader
        title="Announcements"
        description="School notices in Beacon. Staff can also email recipients via the system."
        actions={
          canPost ? (
            <Link href="/announcements/new" className={buttonClassName('primary', 'sm')}>
              New announcement
            </Link>
          ) : undefined
        }
      />

      {visible.length === 0 ? (
        <p className="rounded-xl border bg-background p-6 text-sm text-muted-foreground">
          No announcements yet.
          {canPost ? ' Create one to notify parents or staff.' : ''}
        </p>
      ) : (
        <ul className="space-y-3">
          {visible.map((a) => (
            <li key={a.id}>
              <Link
                href={`/announcements/${a.id}`}
                className="block rounded-xl border bg-background p-4 hover:border-sky-400 transition"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className="font-semibold text-lg">{a.title}</h2>
                  <span className="text-[11px] uppercase tracking-wide font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {a.audience}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{a.body}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {a.published_at
                    ? format(new Date(a.published_at), 'MMM d, yyyy · h:mm a')
                    : ''}
                  {a.author_id === user.id ? ' · You' : ''}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

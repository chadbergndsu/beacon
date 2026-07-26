import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export default async function NewAnnouncementPage() {
  const { profile, user } = await getProfile()
  if (!profile || !['admin', 'staff', 'teacher', 'principal'].includes(profile.role)) {
    redirect('/announcements')
  }

  const admin = createAdminClient()
  let classesQuery = admin
    .from('classes')
    .select('id, name')
    .eq('active', true)
    .order('name')

  if (profile.role === 'teacher') {
    classesQuery = classesQuery.eq('teacher_id', user.id)
  } else if (profile.school_id) {
    classesQuery = classesQuery.eq('school_id', profile.school_id)
  }

  const { data: classes } = await classesQuery

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          <Link href="/announcements" className="hover:underline">
            Announcements
          </Link>
          {' / '}
          New
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">New announcement</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Posts in Beacon and optionally emails recipients through the system mailer.
        </p>
      </div>
      <AnnouncementForm classes={classes ?? []} />
    </div>
  )
}

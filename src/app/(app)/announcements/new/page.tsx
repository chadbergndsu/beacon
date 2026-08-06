import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AnnouncementForm } from '@/components/announcements/AnnouncementForm'
import { PageHeader } from '@/components/ui/page-header'
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
    <div className="page-stack">
      <PageHeader
        eyebrow={
          <>
            <Link href="/announcements" className="hover:underline">
              Announcements
            </Link>
            {' / New'}
          </>
        }
        title="New announcement"
        description="Posts in Beacon and optionally emails recipients through the system mailer."
      />
      <AnnouncementForm classes={classes ?? []} />
    </div>
  )
}

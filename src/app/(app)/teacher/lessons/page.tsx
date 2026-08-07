import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSchoolStaff } from '@/lib/roles'
import { listLessonPlansForClasses } from '@/lib/school-modules/store'
import { buildSampleWeek } from '@/lib/lessons/sample-week'
import type { TeacherClass } from '@/lib/lessons/types'
import { TeacherLessonPlanner } from '@/components/lessons/TeacherLessonPlanner'
import { buttonClassName } from '@/components/ui/button'

export default async function TeacherLessonsPage({
  searchParams,
}: {
  searchParams: Promise<{ demo?: string }>
}) {
  const { profile, user } = await getProfile()
  if (!profile || !isSchoolStaff(profile.role)) {
    redirect('/dashboard')
  }

  const sp = await searchParams
  const wantDemo = sp.demo === '1' || sp.demo === 'true'

  if (wantDemo) {
    const sample = buildSampleWeek(new Date())
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100">
          <p>
            Showing <strong>sample week</strong> (Bible Elijah, Spelling 36–40, Reading Through the
            Seasons, …) so you can try the All Classes accordion.
          </p>
          <Link href="/teacher/lessons" className={buttonClassName('outline', 'sm')}>
            Back to my classes
          </Link>
        </div>
        <TeacherLessonPlanner
          teacherName={sample.teacherName}
          classes={sample.classes}
          plans={sample.plans}
          demoMode
        />
      </div>
    )
  }

  const admin = createAdminClient()
  let classes: TeacherClass[] = []

  if (profile.role === 'teacher') {
    const { data } = await admin
      .from('classes')
      .select('id, name, subject, grade_level')
      .eq('teacher_id', user.id)
      .eq('active', true)
      .order('name')
    classes = (data ?? []) as TeacherClass[]
  } else if (profile.school_id) {
    const { data } = await admin
      .from('classes')
      .select('id, name, subject, grade_level')
      .eq('school_id', profile.school_id)
      .eq('active', true)
      .order('name')
    classes = (data ?? []) as TeacherClass[]
  }

  const schoolId = profile.school_id
  const plans =
    schoolId && classes.length
      ? await listLessonPlansForClasses(
          schoolId,
          classes.map((c) => c.id)
        )
      : []

  const teacherName = profile.full_name || profile.email || 'Teacher'

  return (
    <div className="space-y-3">
      {classes.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          <p>No classes assigned yet — open the sample week to try the new overview.</p>
          <Link href="/teacher/lessons?demo=1" className={buttonClassName('outline', 'sm')}>
            Open sample week
          </Link>
        </div>
      ) : (
        <div className="flex justify-end print:hidden">
          <Link
            href="/teacher/lessons?demo=1"
            className="text-xs font-medium text-muted-foreground hover:text-primary hover:underline"
          >
            Try sample week accordion →
          </Link>
        </div>
      )}
      <TeacherLessonPlanner teacherName={teacherName} classes={classes} plans={plans} />
    </div>
  )
}

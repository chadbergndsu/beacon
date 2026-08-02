import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSchoolStaff } from '@/lib/roles'
import { listLessonPlansForClasses } from '@/lib/school-modules/store'
import {
  TeacherLessonPlanner,
  type TeacherClass,
} from '@/components/lessons/TeacherLessonPlanner'

export default async function TeacherLessonsPage() {
  const { profile, user } = await getProfile()
  if (!profile || !isSchoolStaff(profile.role)) {
    redirect('/dashboard')
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
    // Principal/admin: school-wide overview (still useful for Jen’s model demo)
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
    <TeacherLessonPlanner teacherName={teacherName} classes={classes} plans={plans} />
  )
}

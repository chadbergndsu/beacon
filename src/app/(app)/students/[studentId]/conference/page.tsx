import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ConferenceBriefView } from '@/components/insights/ConferenceBriefView'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { parentCanViewStudent, teacherCanViewStudent } from '@/lib/gradebook-data'
import { buildStudentDinnerAndConference } from '@/lib/insights/load-student-insights'

export default async function ConferenceBriefPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const { profile, user } = await getProfile()
  const admin = createAdminClient()

  const { data: student } = await admin.from('students').select('*').eq('id', studentId).maybeSingle()
  if (!student) notFound()

  let allowed = false
  if (profile?.role === 'parent') {
    allowed = await parentCanViewStudent(user.id, studentId)
  } else if (profile?.role === 'teacher' && profile.school_id) {
    allowed =
      profile.school_id === student.school_id &&
      (await teacherCanViewStudent(user.id, studentId, profile.school_id))
  } else if (
    profile &&
    ['admin', 'staff', 'principal'].includes(profile.role) &&
    profile.school_id
  ) {
    allowed = profile.school_id === student.school_id
  }
  if (!allowed) notFound()

  const { conference, name } = await buildStudentDinnerAndConference({
    id: student.id,
    school_id: student.school_id,
    first_name: student.first_name,
    last_name: student.last_name,
    grade_level: student.grade_level,
  })

  return (
    <div className="space-y-4">
      <p className="print:hidden text-xs font-semibold uppercase tracking-wide text-sky-700">
        <Link href={`/students/${studentId}`} className="hover:underline">
          ← {name}
        </Link>
      </p>
      <ConferenceBriefView brief={conference} />
    </div>
  )
}

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TransparentGradeView } from '@/components/gradebook/TransparentGradeView'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateTransparentGrade } from '@/lib/grades'
import { parentCanViewStudent } from '@/lib/gradebook-data'
import type { Assignment, Grade, GradeCategory } from '@/lib/types'

export default async function StudentOverviewPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const { profile, user } = await getProfile()
  const admin = createAdminClient()

  const { data: student } = await admin.from('students').select('*').eq('id', studentId).maybeSingle()
  if (!student) notFound()

  // Access: parent of student, or staff at same school
  let allowed = false
  if (profile?.role === 'parent') {
    allowed = await parentCanViewStudent(user.id, studentId)
  } else if (
    profile &&
    ['admin', 'staff', 'teacher', 'principal'].includes(profile.role)
  ) {
    allowed = !profile.school_id || profile.school_id === student.school_id
  }
  if (!allowed) notFound()

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId)
  const classIds = (enrollments ?? []).map((e) => e.class_id)

  const { data: classes } = classIds.length
    ? await admin.from('classes').select('id, name, subject, term').in('id', classIds).order('name')
    : { data: [] as { id: string; name: string; subject: string | null; term: string | null }[] }

  const sections = await Promise.all(
    (classes ?? []).map(async (c) => {
      const [{ data: categories }, { data: assignmentsData }] = await Promise.all([
        admin.from('grade_categories').select('*').eq('class_id', c.id),
        admin.from('assignments').select('*').eq('class_id', c.id),
      ])
      const assignments = (assignmentsData ?? []) as Assignment[]
      const cats = (categories ?? []) as GradeCategory[]
      const ids = assignments.map((a) => a.id)
      let grades: Grade[] = []
      if (ids.length) {
        const { data } = await admin
          .from('grades')
          .select('*')
          .eq('student_id', studentId)
          .in('assignment_id', ids)
        grades = (data ?? []) as Grade[]
      }
      const result = calculateTransparentGrade(cats, assignments, grades)
      return { classRow: c, result }
    })
  )

  const name = `${student.first_name} ${student.last_name}`

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          {' / '}
          Student
        </p>
        <h1 className="text-2xl font-bold tracking-tight mt-1">{name}</h1>
        <p className="text-sm text-muted-foreground">
          {student.grade_level ? `Grade ${student.grade_level}` : 'Student'} · All classes
        </p>
      </div>

      {sections.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">No class enrollments.</p>
      ) : (
        <div className="space-y-8">
          {sections.map(({ classRow, result }) => (
            <section key={classRow.id} className="rounded-2xl border bg-background p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{classRow.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {[classRow.subject, classRow.term].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <Link
                  href={`/classes/${classRow.id}/students/${studentId}`}
                  className="text-sm font-medium text-sky-700 hover:underline"
                >
                  Class detail →
                </Link>
              </div>
              <TransparentGradeView
                result={result}
                studentName={name}
                photoUrl={student.photo_url}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

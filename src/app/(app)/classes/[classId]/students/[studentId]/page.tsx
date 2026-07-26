import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TransparentGradeView } from '@/components/gradebook/TransparentGradeView'
import { getProfile } from '@/lib/auth'
import { calculateTransparentGrade } from '@/lib/grades'
import {
  loadClassAssignments,
  loadClassCategories,
  loadClassForUser,
  loadGradesForAssignments,
  loadStudent,
  parentCanViewStudent,
} from '@/lib/gradebook-data'

export default async function StudentGradePage({
  params,
}: {
  params: Promise<{ classId: string; studentId: string }>
}) {
  const { classId, studentId } = await params
  const { profile, user } = await getProfile()

  const classRow = await loadClassForUser(classId, user, profile)
  if (!classRow) notFound()

  if (profile?.role === 'parent') {
    const ok = await parentCanViewStudent(user.id, studentId)
    if (!ok) notFound()
  }

  const studentRow = await loadStudent(studentId)
  if (!studentRow) notFound()

  const [categories, assignments] = await Promise.all([
    loadClassCategories(classId),
    loadClassAssignments(classId),
  ])
  const grades = await loadGradesForAssignments(
    assignments.map((a) => a.id),
    studentId
  )

  const result = calculateTransparentGrade(categories, assignments, grades)
  const name = `${studentRow.first_name} ${studentRow.last_name}`

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          {' / '}
          <Link href={`/classes/${classId}`} className="hover:underline">
            {classRow.name}
          </Link>
          {' / '}
          Student
        </p>
      </div>

      <div className="rounded-2xl border bg-background p-6 shadow-sm">
        <TransparentGradeView
          result={result}
          studentName={name}
          photoUrl={studentRow.photo_url}
        />
      </div>
    </div>
  )
}

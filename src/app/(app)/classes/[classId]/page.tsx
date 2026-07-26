import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ClassGradebookClient } from '@/components/gradebook/ClassGradebookClient'
import { ClassSetupPanel } from '@/components/gradebook/ClassSetupPanel'
import { ClassTabs } from '@/components/gradebook/ClassTabs'
import { getProfile } from '@/lib/auth'
import { validateCategoryWeights } from '@/lib/grades'
import {
  loadClassAssignments,
  loadClassCategories,
  loadClassForUser,
  loadClassRoster,
  loadGradesForAssignments,
} from '@/lib/gradebook-data'

export default async function ClassGradebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { classId } = await params
  const { tab } = await searchParams
  const activeTab = tab === 'setup' ? 'setup' : 'grades'

  const { profile, user } = await getProfile()

  const classRow = await loadClassForUser(classId, user, profile)
  if (!classRow) notFound()

  const canEnter =
    profile?.role === 'admin' ||
    profile?.role === 'staff' ||
    profile?.role === 'principal' ||
    (profile?.role === 'teacher' && classRow.teacher_id === user.id)

  const [students, assignments, categories] = await Promise.all([
    loadClassRoster(classId),
    loadClassAssignments(classId),
    loadClassCategories(classId),
  ])
  const grades = await loadGradesForAssignments(assignments.map((a) => a.id))
  const weights = validateCategoryWeights(categories)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            <Link href="/dashboard" className="hover:underline">
              Dashboard
            </Link>
            {' / '}
            Class
          </p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{classRow.name}</h1>
          <p className="text-sm text-muted-foreground">
            {[classRow.subject, classRow.grade_level, classRow.term].filter(Boolean).join(' · ')}
          </p>
        </div>
        {canEnter && (
          <Suspense fallback={null}>
            <ClassTabs classId={classId} />
          </Suspense>
        )}
      </div>

      {canEnter && !weights.ok && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
          {weights.message} Fix weights under <strong>Class setup</strong>.
        </div>
      )}

      {students.length > 0 && (
        <div className="rounded-xl border bg-background p-4">
          <h2 className="text-sm font-semibold mb-2">Students ({students.length})</h2>
          <ul className="flex flex-wrap gap-2">
            {students.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/classes/${classId}/students/${s.id}`}
                  className="inline-flex rounded-lg border px-3 py-1.5 text-sm hover:border-sky-400 hover:bg-sky-50"
                >
                  {s.last_name}, {s.first_name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!canEnter ? (
        <p className="text-sm text-muted-foreground rounded-xl border bg-background p-4">
          You can view transparent grades via the student links above. Score entry is limited to the
          class teacher and school leadership.
        </p>
      ) : activeTab === 'setup' ? (
        <ClassSetupPanel
          classId={classId}
          categories={categories}
          assignments={assignments}
          students={students}
        />
      ) : students.length === 0 || assignments.length === 0 ? (
        <div className="rounded-xl border bg-background p-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            {students.length === 0
              ? 'No students enrolled yet.'
              : 'No assignments yet — add categories and assignments to start grading.'}
          </p>
          <Link
            href={`/classes/${classId}?tab=setup`}
            className="inline-flex rounded-lg bg-sky-600 text-white px-4 py-2 text-sm font-semibold"
          >
            Open class setup
          </Link>
        </div>
      ) : (
        <ClassGradebookClient
          classId={classId}
          classTitle={classRow.name}
          students={students}
          assignments={assignments}
          initialGrades={grades}
          categories={categories}
        />
      )}
    </div>
  )
}

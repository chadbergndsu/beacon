'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { GradeEntryGrid } from '@/components/gradebook/GradeEntryGrid'
import { TransparentGradeView } from '@/components/gradebook/TransparentGradeView'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { saveGrades } from '@/app/actions/grades'
import { calculateTransparentGrade } from '@/lib/grades'
import type { Assignment, Grade, GradeCategory, Student } from '@/lib/types'

export function ClassGradebookClient({
  classId,
  classTitle,
  students,
  assignments,
  initialGrades,
  categories,
}: {
  classId: string
  classTitle: string
  students: Student[]
  assignments: Assignment[]
  initialGrades: Grade[]
  categories: GradeCategory[]
}) {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [liveGrades, setLiveGrades] = useState<Grade[]>(initialGrades)
  const [previewStudentId, setPreviewStudentId] = useState(students[0]?.id ?? '')

  const previewStudent = students.find((s) => s.id === previewStudentId)
  const previewResult = useMemo(() => {
    if (!previewStudent) return null
    const studentGrades = liveGrades.filter((g) => g.student_id === previewStudent.id)
    return calculateTransparentGrade(categories, assignments, studentGrades)
  }, [previewStudent, liveGrades, categories, assignments])

  return (
    <div className="space-y-8">
      <GradeEntryGrid
        students={students}
        assignments={assignments}
        initialGrades={initialGrades}
        categories={categories}
        classTitle={classTitle}
        exportHref={`/api/classes/${classId}/export`}
        setupHref={`/classes/${classId}?tab=setup`}
        settingsHref="/teacher/settings"
        onGradesChange={setLiveGrades}
        onSave={async (grades, options) => {
          setMessage(null)
          setError(null)
          setLiveGrades(grades)
          const result = await saveGrades(classId, grades, options)
          if (!result.ok) {
            setError(result.error)
            return
          }
          setMessage(
            result.notifyNote ? `Grades saved. ${result.notifyNote}` : 'Grades saved successfully.'
          )
        }}
      />

      {message ? (
        <div className="rounded-xl border border-emerald-200 bg-success-soft px-4 py-3 text-sm font-medium text-success">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-danger-soft px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      ) : null}

      {previewStudent && previewResult ? (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-muted/30 px-5 py-4">
            <div>
              <h3 className="font-semibold tracking-tight">Live parent preview</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Exactly what parents see — updates as you type
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={previewStudentId}
                onChange={(e) => setPreviewStudentId(e.target.value)}
                className="h-10 rounded-xl border border-border bg-card px-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.last_name}, {s.first_name}
                  </option>
                ))}
              </select>
              <Link href={`/classes/${classId}/students/${previewStudent.id}`}>
                <Button variant="outline" size="md">
                  Open full view
                </Button>
              </Link>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <TransparentGradeView
              result={previewResult}
              studentName={`${previewStudent.first_name} ${previewStudent.last_name}`}
              photoUrl={previewStudent.photo_url}
              compact
            />
          </div>
        </Card>
      ) : null}
    </div>
  )
}

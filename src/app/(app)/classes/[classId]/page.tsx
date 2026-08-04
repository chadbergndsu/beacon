import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { ClassGradebookClient } from '@/components/gradebook/ClassGradebookClient'
import { ClassSetupPanel } from '@/components/gradebook/ClassSetupPanel'
import { ClassTabs } from '@/components/gradebook/ClassTabs'
import { LessonPlansPanel } from '@/components/lessons/LessonPlansPanel'
import { PulsePanel } from '@/components/pulse/PulsePanel'
import { AttendancePanel } from '@/components/attendance/AttendancePanel'
import { ConfigurableView } from '@/components/view-prefs/ConfigurableView'
import { ViewSection } from '@/components/view-prefs/ViewSection'
import { getProfile } from '@/lib/auth'
import { validateCategoryWeights } from '@/lib/grades'
import {
  loadClassAssignments,
  loadClassCategories,
  loadClassForUser,
  loadClassRoster,
  loadGradesForAssignments,
} from '@/lib/gradebook-data'
import { canEnterGrades } from '@/lib/roles'
import { listLessonPlans, listPulsesForClass } from '@/lib/school-modules/store'
import { loadAttendanceForClassDate } from '@/lib/attendance/store'
import { loadTeacherClassMissing } from '@/lib/insights/load-missing-work'
import { loadScreenLayout } from '@/lib/view-prefs/store'
import { Badge } from '@/components/ui/badge'

export default async function ClassGradebookPage({
  params,
  searchParams,
}: {
  params: Promise<{ classId: string }>
  searchParams: Promise<{ tab?: string; date?: string }>
}) {
  const { classId } = await params
  const sp = await searchParams
  const tab = sp.tab
  const activeTab =
    tab === 'setup' || tab === 'lessons' || tab === 'pulse' || tab === 'attendance'
      ? tab
      : 'grades'
  const attendanceDate = sp.date || new Date().toISOString().slice(0, 10)

  const { profile, user } = await getProfile()

  const classRow = await loadClassForUser(classId, user, profile)
  if (!classRow) notFound()

  const canEnter = canEnterGrades(profile?.role, classRow.teacher_id, user.id)

  const [students, assignments, categories] = await Promise.all([
    loadClassRoster(classId),
    loadClassAssignments(classId),
    loadClassCategories(classId),
  ])
  const grades = await loadGradesForAssignments(assignments.map((a) => a.id))
  const weights = validateCategoryWeights(categories)

  const schoolId = classRow.school_id
  const [lessonPlans, pulses, attendanceRecords, missingRollup] =
    canEnter && schoolId
      ? await Promise.all([
          listLessonPlans(schoolId, classId),
          listPulsesForClass(schoolId, classId),
          loadAttendanceForClassDate(classId, attendanceDate),
          loadTeacherClassMissing(classId, classRow.name),
        ])
      : [[], [], [], null]

  const showMissing =
    canEnter &&
    activeTab === 'grades' &&
    missingRollup &&
    missingRollup.totalMissingItems > 0
  const showRoster = students.length > 0 && activeTab === 'grades'
  const showGradeEntry = activeTab === 'grades'
  const showSetup = canEnter && activeTab === 'setup'
  const showAttendance = canEnter && activeTab === 'attendance'
  const showLessons = canEnter && activeTab === 'lessons'
  const showPulse = canEnter && activeTab === 'pulse'

  const present = [
    'header',
    ...(canEnter ? (['tabs'] as const) : []),
    ...(showMissing ? (['missing_work'] as const) : []),
    ...(showRoster ? (['roster_chips'] as const) : []),
    ...(showGradeEntry ? (['grade_entry'] as const) : []),
    ...(showSetup ? (['setup'] as const) : []),
    ...(showLessons ? (['lessons'] as const) : []),
    ...(showPulse ? (['pulse'] as const) : []),
    ...(showAttendance ? (['attendance'] as const) : []),
  ]

  const viewLayout = await loadScreenLayout(user.id, 'class_gradebook', [...present])

  return (
    <ConfigurableView screenId="class_gradebook" initialLayout={viewLayout}>
      <ViewSection id="header" title="Class header" locked>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
              <Link href="/dashboard" className="hover:underline">
                Dashboard
              </Link>
              {' / '}
              Academics
            </p>
            <h1 className="text-2xl font-bold tracking-tight mt-1">{classRow.name}</h1>
            <p className="text-sm text-muted-foreground">
              {[classRow.subject, classRow.grade_level, classRow.term].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      </ViewSection>

      {canEnter ? (
        <ViewSection id="tabs" title="Class tabs" locked>
          <div className="space-y-3">
            <Suspense fallback={null}>
              <ClassTabs classId={classId} />
            </Suspense>
            {activeTab === 'grades' && !weights.ok && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-950 px-4 py-3 text-sm">
                {weights.message} Fix weights under <strong>Class setup</strong>.
              </div>
            )}
          </div>
        </ViewSection>
      ) : null}

      {showMissing && missingRollup ? (
        <ViewSection id="missing_work" title="Missing work radar">
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                  Missing work radar
                </p>
                <p className="text-sm text-amber-950 dark:text-amber-100 mt-0.5">
                  {missingRollup.studentsWithMissing} student(s) ·{' '}
                  {missingRollup.totalMissingItems} past-due / unscored item(s)
                </p>
              </div>
              <Badge variant="warning">Focus</Badge>
            </div>
            {missingRollup.topStudents.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {missingRollup.topStudents.map((s) => (
                  <li key={s.studentId}>
                    <Link
                      href={`/students/${s.studentId}`}
                      className="inline-flex rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-medium text-amber-950 hover:bg-amber-100 dark:bg-amber-950/50 dark:text-amber-100 dark:border-amber-800"
                    >
                      {s.studentName} ×{s.count}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </ViewSection>
      ) : null}

      {showRoster ? (
        <ViewSection id="roster_chips" title="Student quick links">
          <div className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
            <h2 className="text-sm font-semibold mb-2">Students ({students.length})</h2>
            <ul className="flex flex-wrap gap-2">
              {students.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/classes/${classId}/students/${s.id}`}
                    className="inline-flex rounded-xl border px-3 py-1.5 text-sm hover:border-sky-400 hover:bg-sky-50 transition"
                  >
                    {s.last_name}, {s.first_name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </ViewSection>
      ) : null}

      {showGradeEntry ? (
        <ViewSection id="grade_entry" title="Grade entry & parent preview">
          {!canEnter ? (
            <p className="text-sm text-muted-foreground rounded-2xl border bg-card p-4">
              You can view transparent grades via the student links above. Score entry is limited
              to the class teacher and school leadership.
            </p>
          ) : students.length === 0 || assignments.length === 0 ? (
            <div className="rounded-2xl border bg-card p-6 space-y-3">
              <p className="text-sm text-muted-foreground">
                {students.length === 0
                  ? 'No students enrolled yet.'
                  : 'No assignments yet — add categories and assignments to start grading.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/classes/${classId}?tab=setup`}
                  className="inline-flex rounded-xl bg-sky-600 text-white px-4 py-2 text-sm font-semibold"
                >
                  Open class setup
                </Link>
                <Link
                  href={`/classes/${classId}?tab=lessons`}
                  className="inline-flex rounded-xl border px-4 py-2 text-sm font-semibold"
                >
                  Lesson plans
                </Link>
              </div>
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
        </ViewSection>
      ) : null}

      {showSetup ? (
        <ViewSection id="setup" title="Categories & assignments setup">
          <ClassSetupPanel
            classId={classId}
            categories={categories}
            assignments={assignments}
            students={students}
          />
        </ViewSection>
      ) : null}

      {showAttendance ? (
        <ViewSection id="attendance" title="Attendance panel">
          <AttendancePanel
            classId={classId}
            students={students}
            initialDate={attendanceDate}
            initialRecords={attendanceRecords}
          />
        </ViewSection>
      ) : null}

      {showLessons ? (
        <ViewSection id="lessons" title="Lesson plans panel">
          <LessonPlansPanel classId={classId} className={classRow.name} plans={lessonPlans} />
        </ViewSection>
      ) : null}

      {showPulse ? (
        <ViewSection id="pulse" title="Pulse panel">
          {students.length === 0 ? (
            <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
              Enroll students before logging Beacon Pulse.
            </div>
          ) : (
            <PulsePanel classId={classId} students={students} pulses={pulses} />
          )}
        </ViewSection>
      ) : null}

    </ConfigurableView>
  )
}

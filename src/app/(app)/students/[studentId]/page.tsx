import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TransparentGradeView } from '@/components/gradebook/TransparentGradeView'
import { StudentPulseTimeline } from '@/components/pulse/StudentPulseTimeline'
import { DinnerTableCard } from '@/components/insights/DinnerTableCard'
import { EmailDigestButton } from '@/components/insights/EmailDigestButton'
import { MissingWorkRadar } from '@/components/insights/MissingWorkRadar'
import { ConfigurableView } from '@/components/view-prefs/ConfigurableView'
import { ViewSection } from '@/components/view-prefs/ViewSection'
import { loadMissingWorkForStudent } from '@/lib/insights/load-missing-work'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateTransparentGrade } from '@/lib/grades'
import { parentCanViewStudent, teacherCanViewStudent } from '@/lib/gradebook-data'
import { listPulsesForStudent } from '@/lib/school-modules/store'
import { buildStudentDinnerAndConference } from '@/lib/insights/load-student-insights'
import { loadScreenLayout } from '@/lib/view-prefs/store'
import { PageHeader } from '@/components/ui/page-header'
import { buttonClassName } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
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

  // Access: parent of student; leadership same school; teacher only if on roster of their class
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
  const pulses =
    profile?.school_id || student.school_id
      ? await listPulsesForStudent(profile?.school_id || student.school_id, studentId)
      : []

  const [{ dinner }, missingWork] = await Promise.all([
    buildStudentDinnerAndConference({
      id: student.id,
      school_id: student.school_id,
      first_name: student.first_name,
      last_name: student.last_name,
      grade_level: student.grade_level,
    }),
    loadMissingWorkForStudent(studentId, name),
  ])

  const viewLayout = await loadScreenLayout(user.id, 'student_overview', [
    'header',
    'dinner_table',
    'missing_work',
    'pulse',
    'grades',
  ])

  return (
    <ConfigurableView screenId="student_overview" initialLayout={viewLayout}>
      <ViewSection id="header" title="Student header" locked>
        <PageHeader
          eyebrow={
            <>
              <Link href="/dashboard" className="hover:underline">
                Home
              </Link>
              {' · '}
              Student
            </>
          }
          title={name}
          description={
            student.grade_level
              ? `Grade ${student.grade_level} · Academics + Beacon Pulse`
              : 'Academics + Beacon Pulse'
          }
          actions={
            <>
              <Link
                href={`/students/${studentId}/report-card`}
                className={buttonClassName('navy', 'sm')}
              >
                Report card
              </Link>
              <Link
                href={`/students/${studentId}/conference`}
                className={buttonClassName('outline', 'sm')}
              >
                Conference brief
              </Link>
              {profile &&
              ['admin', 'staff', 'teacher', 'principal'].includes(profile.role) ? (
                <EmailDigestButton studentId={studentId} />
              ) : null}
            </>
          }
        />
      </ViewSection>

      <ViewSection id="dinner_table" title="Dinner Table Digest">
        <DinnerTableCard
          digest={dinner}
          emailAction={
            profile &&
            ['admin', 'staff', 'teacher', 'principal'].includes(profile.role) ? (
              <EmailDigestButton studentId={studentId} variant="card" />
            ) : null
          }
        />
      </ViewSection>

      <ViewSection id="missing_work" title="Missing work">
        <MissingWorkRadar
          summaries={[missingWork]}
          title={`${name.split(' ')[0]}'s missing work`}
        />
      </ViewSection>

      <ViewSection id="pulse" title="Pulse timeline">
        <StudentPulseTimeline pulses={pulses} studentName={name} />
      </ViewSection>

      <ViewSection id="grades" title="Class grades">
        {sections.length === 0 ? (
          <EmptyState title="No class enrollments" />
        ) : (
          <div className="space-y-4">
            <Table>
              <THead>
                <TR>
                  <TH>Class</TH>
                  <TH>Details</TH>
                  <TH className="text-right">Grade</TH>
                  <TH className="text-right" />
                </TR>
              </THead>
              <TBody>
                {sections.map(({ classRow, result }) => (
                  <TR key={classRow.id}>
                    <TD className="font-medium">{classRow.name}</TD>
                    <TD className="text-muted-foreground">
                      {[classRow.subject, classRow.term].filter(Boolean).join(' · ') || '—'}
                    </TD>
                    <TD className="text-right tabular-nums font-medium">
                      {result.overall != null ? `${result.overall}%` : '—'}
                      {result.letter ? ` ${result.letter}` : ''}
                    </TD>
                    <TD className="text-right">
                      <Link
                        href={`/classes/${classRow.id}/students/${studentId}`}
                        className="text-[12px] font-medium text-primary hover:underline"
                      >
                        Detail
                      </Link>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            {sections.map(({ classRow, result }) => (
              <details key={classRow.id} className="rounded-lg border border-border">
                <summary className="cursor-pointer px-3 py-2 text-[13px] font-medium">
                  {classRow.name} — calculation
                </summary>
                <div className="border-t border-border px-3 py-3">
                  <TransparentGradeView
                    result={result}
                    studentName={name}
                    photoUrl={student.photo_url}
                  />
                </div>
              </details>
            ))}
          </div>
        )}
      </ViewSection>
    </ConfigurableView>
  )
}

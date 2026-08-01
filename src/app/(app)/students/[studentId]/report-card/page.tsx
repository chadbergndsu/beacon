import NextLink from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { parentCanViewStudent } from '@/lib/gradebook-data'
import { listPulsesForStudent } from '@/lib/school-modules/store'
import { loadAttendanceForStudent } from '@/lib/attendance/store'
import { buildReportCard } from '@/lib/report-card'
import type { Assignment, Grade, GradeCategory, Student } from '@/lib/types'
import { ReportCardPrint } from '@/components/reports/ReportCardPrint'

export default async function ReportCardPage({
  params,
}: {
  params: Promise<{ studentId: string }>
}) {
  const { studentId } = await params
  const { profile, user } = await getProfile()
  const admin = createAdminClient()

  const { data: student } = await admin
    .from('students')
    .select('*')
    .eq('id', studentId)
    .maybeSingle()
  if (!student) notFound()

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

  const { data: school } = await admin
    .from('schools')
    .select('name')
    .eq('id', student.school_id)
    .maybeSingle()

  const { data: enrollments } = await admin
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId)
  const classIds = (enrollments ?? []).map((e) => e.class_id)

  const { data: classes } = classIds.length
    ? await admin.from('classes').select('id, name, subject, term').in('id', classIds)
    : { data: [] as { id: string; name: string; subject: string | null; term: string | null }[] }

  const classBlocks = await Promise.all(
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
      return {
        className: c.name,
        subject: c.subject,
        term: c.term,
        categories: cats,
        assignments,
        grades,
      }
    })
  )

  const schoolId = profile?.school_id || student.school_id
  const pulses = await listPulsesForStudent(schoolId, studentId)
  const attendance = await loadAttendanceForStudent(studentId, 60)

  const report = buildReportCard({
    student: student as Student,
    schoolName: school?.name || 'School',
    classBlocks,
    pulses,
    attendance,
  })

  return (
    <div className="space-y-4">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
            <NextLink href={`/students/${studentId}`} className="hover:underline">
              Student
            </NextLink>
            {' / '}
            Report card
          </p>
          <h1 className="text-xl font-bold mt-1">
            {student.first_name} {student.last_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Generated {format(new Date(report.generatedAt), 'MMMM d, yyyy')}
          </p>
        </div>
        <ReportCardPrint />
      </div>
      <ReportCardView data={report} />
    </div>
  )
}

function ReportCardView({ data }: { data: ReturnType<typeof buildReportCard> }) {
  const s = data.student
  return (
    <article className="rounded-2xl border bg-white text-slate-900 shadow-[var(--shadow-soft)] print:shadow-none print:border-0 overflow-hidden">
      <header className="bg-[#0a1628] text-white px-8 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
          {data.schoolName}
        </p>
        <h2 className="mt-2 text-3xl font-bold tracking-tight">Student Report Card</h2>
        <p className="mt-3 text-lg">
          {s.first_name} {s.last_name}
          {s.grade_level ? ` · Grade ${s.grade_level}` : ''}
        </p>
        <p className="text-sm text-slate-300 mt-1">
          Beacon school suite · Transparent academics + whole-child pulse
        </p>
      </header>

      <div className="px-8 py-6 space-y-8">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Beacon Pulse summary
            </h3>
            <p className="mt-2 text-sm">
              Strong {data.pulseSummary.strong} · Steady {data.pulseSummary.steady} · Needs care{' '}
              {data.pulseSummary.needs_care}
            </p>
            {data.pulseSummary.latestNote && (
              <p className="mt-2 text-sm text-slate-600">{data.pulseSummary.latestNote}</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Attendance (recent)
            </h3>
            <p className="mt-2 text-sm">
              Present {data.attendanceSummary.present} · Absent {data.attendanceSummary.absent} ·
              Tardy {data.attendanceSummary.tardy} · Excused {data.attendanceSummary.excused}
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Academic performance
          </h3>
          {data.classes.length === 0 ? (
            <p className="text-sm text-slate-500">No class enrollments.</p>
          ) : (
            data.classes.map((c) => (
              <div key={c.className} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="font-bold">{c.className}</p>
                    <p className="text-xs text-slate-500">
                      {[c.subject, c.term].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black tabular-nums">
                      {c.overall != null ? `${c.overall}%` : '—'}
                    </p>
                    {c.letter && (
                      <p className="text-sm font-semibold text-sky-800">{c.letter}</p>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs font-mono text-slate-600 break-words">{c.formula}</p>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {c.breakdown.map((b) => (
                      <p key={b.name} className="text-sm text-slate-700">
                        <span className="font-medium">{b.name}</span> ({b.weight}%)
                        {b.average != null ? ` · ${b.average}%` : ' · —'}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <footer className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          Generated {format(new Date(data.generatedAt), 'MMMM d, yyyy · h:mm a')} via Beacon ·
          Transparent calculations use weighted categories with missing-as-zero unless otherwise
          noted. This document is for family communication and school records.
        </footer>
      </div>
    </article>
  )
}

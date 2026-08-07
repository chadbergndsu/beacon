import Link from 'next/link'
import { format } from 'date-fns'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateTransparentGrade } from '@/lib/grades'
import { buildParentFeed } from '@/lib/parent-feed'
import {
  loadMissingWorkForParentChildren,
  loadTeacherToday,
} from '@/lib/insights/load-missing-work'
import { ParentFeed } from '@/components/parent/ParentFeed'
import { ParentBillingCard } from '@/components/parent/ParentBillingCard'
import { ParentExperienceFeedback } from '@/components/parent/ParentExperienceFeedback'
import { MissingWorkRadar } from '@/components/insights/MissingWorkRadar'
import { TeacherTodayCard } from '@/components/insights/TeacherTodayCard'
import { ConfigurableView } from '@/components/view-prefs/ConfigurableView'
import { ViewSection } from '@/components/view-prefs/ViewSection'
import { loadScreenLayout } from '@/lib/view-prefs/store'
import { TeacherEncouragementBanner } from '@/components/teacher/TeacherEncouragementBanner'
import { teacherEncouragementForDay } from '@/lib/teacher/encouragement'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { buttonClassName } from '@/components/ui/button'
import { recordPilotActivity } from '@/lib/pilot-analytics/activity'
import { isoWeekStart } from '@/lib/pilot-analytics/windows'
import type { ParentExperienceRating } from '@/lib/pilot-analytics/parent-feedback'
import type { Assignment, Grade, GradeCategory } from '@/lib/types'

export default async function DashboardPage() {
  const { profile, user, supabase } = await getProfile()
  const admin = createAdminClient()

  if (!profile) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h1 className="text-xl font-bold">Profile not set up</h1>
        <p className="mt-2 text-sm">
          You are signed in as <strong>{user.email}</strong>, but there is no row in{' '}
          <code className="rounded bg-amber-100 px-1 text-xs">profiles</code> for your user id.
        </p>
      </div>
    )
  }

  const role = profile.role
  const schoolId = profile.school_id
  const firstName = profile.full_name?.trim().split(/\s+/)[0]

  type Child = {
    id: string
    first_name: string
    last_name: string
    grade_level: string | null
  }
  type Announcement = {
    id: string
    title: string
    body: string
    audience: string
    published_at: string | null
  }
  type ParentInvoices = Awaited<
    ReturnType<typeof import('@/lib/billing/invoice-email').listOpenInvoicesForParentEmail>
  >

  const parentActivityPromise =
    role === 'parent' && schoolId
      ? recordPilotActivity({
          schoolId,
          userId: user.id,
          actorRole: role,
          eventType: 'parent_portal',
        })
      : Promise.resolve({ recorded: false })

  const parentFeedbackPromise: Promise<{
    response: {
      rating: ParentExperienceRating
      comment: string | null
    } | null
    unavailable: boolean
  }> = role === 'parent' && schoolId
    ? (async () => {
        const { data, error } = await supabase
          .from('parent_experience_feedback')
          .select('rating, comment')
          .eq('parent_id', user.id)
          .eq('school_id', schoolId)
          .eq('surface', 'parent_dashboard')
          .eq('week_start', isoWeekStart(new Date()))
          .maybeSingle()

        if (error) return { response: null, unavailable: true }
        if (data && (data.rating === 'helpful' || data.rating === 'not_yet')) {
          return {
            response: {
              rating: data.rating,
              comment: typeof data.comment === 'string' ? data.comment : null,
            },
            unavailable: false,
          }
        }
        return { response: null, unavailable: false }
      })()
    : Promise.resolve({ response: null, unavailable: false })

  const childrenPromise: Promise<Child[]> =
    role === 'parent'
      ? (async () => {
          const { data: links } = await admin
            .from('parent_students')
            .select('student_id')
            .eq('parent_id', user.id)
          const ids = (links ?? []).map((link) => link.student_id)
          if (!ids.length) return []

          const { data } = await admin
            .from('students')
            .select('id, first_name, last_name, grade_level')
            .in('id', ids)
          return (data ?? []) as Child[]
        })()
      : Promise.resolve([])

  const announcementsPromise: Promise<Announcement[]> = schoolId
    ? (async () => {
        let query = admin
          .from('announcements')
          .select('id, title, body, audience, published_at')
          .eq('school_id', schoolId)
          .order('published_at', { ascending: false })
          .limit(5)
        if (role === 'parent') {
          query = query.in('audience', ['parents', 'all'])
        }
        const { data } = await query
        return data ?? []
      })()
    : Promise.resolve([])

  const parentInvoicesPromise: Promise<ParentInvoices> =
    role === 'parent' && schoolId && user.email
      ? (async () => {
          try {
            const { listOpenInvoicesForParentEmail } = await import(
              '@/lib/billing/invoice-email'
            )
            return await listOpenInvoicesForParentEmail(schoolId, user.email!)
          } catch {
            return []
          }
        })()
      : Promise.resolve([])

  let initialParentFeedback: {
    rating: ParentExperienceRating
    comment: string | null
  } | null = null
  let parentFeedbackUnavailable = false

  let classes: {
    id: string
    name: string
    subject: string | null
    grade_level: string | null
    term: string | null
    teacher_id: string | null
  }[] = []

  if (role === 'teacher') {
    const { data } = await admin
      .from('classes')
      .select('id, name, subject, grade_level, term, teacher_id')
      .eq('teacher_id', user.id)
      .eq('active', true)
      .order('name')
    classes = data ?? []
  } else if (
    (role === 'admin' || role === 'staff' || role === 'principal') &&
    schoolId
  ) {
    const { data } = await admin
      .from('classes')
      .select('id, name, subject, grade_level, term, teacher_id')
      .eq('active', true)
      .eq('school_id', schoolId)
      .order('name')
    classes = data ?? []
  }

  const classIds = classes.map((c) => c.id)
  const rosterCount = new Map<string, number>()
  if (classIds.length) {
    const { data: enroll } = await admin
      .from('enrollments')
      .select('class_id')
      .in('class_id', classIds)
    for (const e of enroll ?? []) {
      rosterCount.set(e.class_id, (rosterCount.get(e.class_id) || 0) + 1)
    }
  }

  const children = await childrenPromise

  const canPost = ['admin', 'staff', 'teacher', 'principal'].includes(role)
  const isPrincipal = role === 'principal'
  const showQuick = canPost

  const parentMissing =
    role === 'parent' && children.length
      ? await loadMissingWorkForParentChildren(children)
      : []
  const teacherToday =
    (role === 'teacher' || role === 'admin' || role === 'staff' || role === 'principal') &&
    classes.length
      ? await loadTeacherToday(classes.map((c) => ({ id: c.id, name: c.name })))
      : null

  const isStaffHome =
    role === 'teacher' || role === 'admin' || role === 'staff' || role === 'principal'

  const presentSectionIds = [
    'header',
    ...(role === 'teacher' ? (['teacher_encouragement'] as const) : []),
    'announcements',
    ...(showQuick ? (['quick_mobile'] as const) : []),
    ...(teacherToday ? (['teacher_today'] as const) : []),
    ...(isStaffHome ? (['classes'] as const) : []),
    ...(role === 'parent' && schoolId ? (['parent_billing'] as const) : []),
    ...(role === 'parent' && parentMissing.length > 0 ? (['parent_missing'] as const) : []),
    ...(role === 'parent' ? (['children'] as const) : []),
    ...(role === 'parent' && schoolId && children.length > 0
      ? (['parent_feed'] as const)
      : []),
    ...(role === 'parent' && schoolId ? (['parent_feedback'] as const) : []),
  ]

  const viewLayoutPromise = loadScreenLayout(user.id, 'dashboard', [...presentSectionIds])
  const [parentFeedbackResult, announcements, parentInvoices, viewLayout] = await Promise.all([
    parentFeedbackPromise,
    announcementsPromise,
    parentInvoicesPromise,
    viewLayoutPromise,
    parentActivityPromise,
  ])
  initialParentFeedback = parentFeedbackResult.response
  parentFeedbackUnavailable = parentFeedbackResult.unavailable
  const teacherEncouragement =
    role === 'teacher' ? teacherEncouragementForDay(user.id) : null

  const welcomeDescription =
    role === 'parent'
      ? 'Balances, Dinner Table Digest, grades, and Pulse — your family’s home.'
      : isPrincipal
        ? 'School-wide hub. Open Office for tuition, go-live, and climate.'
        : 'Your classroom home. Use Edit view to show only what you need.'

  return (
    <ConfigurableView screenId="dashboard" initialLayout={viewLayout}>
      {showQuick ? (
        <ViewSection id="quick_mobile" title="Mobile quick mode">
          <Link
            href="/teacher/quick"
            className="flex items-center justify-between gap-3 rounded-lg border border-primary/25 bg-primary px-4 py-3 text-primary-foreground sm:hidden"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground/80">
                On your phone
              </p>
              <p className="truncate font-semibold">Teacher Quick Mode</p>
              <p className="text-xs text-primary-foreground/85">Attendance · scores · pulse</p>
            </div>
            <span className="shrink-0 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold">
              Open →
            </span>
          </Link>
        </ViewSection>
      ) : null}

      <ViewSection id="header" title="Welcome header" locked>
        <PageHeader
          title={<>Welcome{firstName ? `, ${firstName}` : ''}</>}
          description={welcomeDescription}
          actions={
            canPost ? (
              <>
                <Link href="/teacher/classroom" className={buttonClassName('primary', 'sm')}>
                  Classroom
                </Link>
                <Link
                  href="/teacher/quick"
                  className={buttonClassName('outline', 'sm', 'hidden sm:inline-flex')}
                >
                  Quick
                </Link>
                <Link href="/announcements/new" className={buttonClassName('outline', 'sm')}>
                  Announce
                </Link>
                {isPrincipal ? (
                  <>
                    <Link href="/principal" className={buttonClassName('outline', 'sm')}>
                      Office
                    </Link>
                    <Link href="/principal/release" className={buttonClassName('ghost', 'sm')}>
                      Go-live
                    </Link>
                  </>
                ) : null}
              </>
            ) : isPrincipal ? (
              <>
                <Link href="/principal" className={buttonClassName('primary', 'sm')}>
                  Office
                </Link>
                <Link href="/principal/release" className={buttonClassName('outline', 'sm')}>
                  Go-live
                </Link>
              </>
            ) : undefined
          }
        />
      </ViewSection>

      {teacherEncouragement ? (
        <ViewSection id="teacher_encouragement" title="Encouragement" locked>
          <TeacherEncouragementBanner
            initial={teacherEncouragement.item}
            initialIndex={teacherEncouragement.index}
          />
        </ViewSection>
      ) : null}

      {teacherToday ? (
        <ViewSection id="teacher_today" title="Today's focus">
          <TeacherTodayCard
            rollups={teacherToday.rollups}
            totalMissingStudents={teacherToday.totalMissingStudents}
            totalMissingItems={teacherToday.totalMissingItems}
          />
        </ViewSection>
      ) : null}

      {isStaffHome ? (
        <ViewSection id="classes" title="Classes">
          <section className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[13px] font-medium text-foreground">Classes</p>
              {classes.length > 0 ? (
                <Link
                  href="/teacher/classroom"
                  className="text-[12px] font-medium text-primary hover:underline"
                >
                  Manage
                </Link>
              ) : null}
            </div>
            {classes.length === 0 ? (
              <EmptyState
                title="No classes yet"
                description="Create subjects, add students, and run grades."
                action={
                  <Link href="/teacher/classroom" className={buttonClassName('primary', 'sm')}>
                    Open classroom
                  </Link>
                }
              />
            ) : (
              <Table>
                <THead>
                  <TR>
                    <TH>Class</TH>
                    <TH>Subject</TH>
                    <TH>Grade</TH>
                    <TH>Term</TH>
                    <TH className="text-right">Students</TH>
                    <TH className="text-right" />
                  </TR>
                </THead>
                <TBody>
                  {classes.map((c) => (
                    <TR key={c.id}>
                      <TD>
                        <Link
                          href={`/classes/${c.id}`}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TD>
                      <TD className="text-muted-foreground">{c.subject || '—'}</TD>
                      <TD className="text-muted-foreground">{c.grade_level || '—'}</TD>
                      <TD className="text-muted-foreground">{c.term || '—'}</TD>
                      <TD className="text-right tabular-nums">{rosterCount.get(c.id) || 0}</TD>
                      <TD className="text-right">
                        <Link
                          href={`/classes/${c.id}`}
                          className="text-[12px] font-medium text-primary hover:underline"
                        >
                          Gradebook
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </section>
        </ViewSection>
      ) : null}

      {role === 'parent' && schoolId ? (
        <ViewSection id="parent_billing" title="Balances & pay">
          <section id="billing" className="max-w-2xl space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Balances &amp; pay</h2>
            <ParentBillingCard invoices={parentInvoices} />
          </section>
        </ViewSection>
      ) : null}

      {role === 'parent' && parentMissing.length > 0 ? (
        <ViewSection id="parent_missing" title="Family missing work">
          <MissingWorkRadar summaries={parentMissing} title="Family missing work" />
        </ViewSection>
      ) : null}

      {role === 'parent' ? (
        <ViewSection id="children" title="Your children">
          <section className="space-y-2">
            <p className="text-[13px] font-medium text-foreground">Your children</p>
            {children.length === 0 ? (
              <EmptyState
                title="No students linked"
                description="Ask the school to link your children to this account."
              />
            ) : (
              <>
                <Table>
                  <THead>
                    <TR>
                      <TH>Student</TH>
                      <TH>Grade</TH>
                      <TH className="text-right">Overview</TH>
                      <TH className="text-right">Report</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {children.map((child) => (
                      <TR key={child.id}>
                        <TD className="font-medium">
                          {child.last_name}, {child.first_name}
                        </TD>
                        <TD className="text-muted-foreground">{child.grade_level || '—'}</TD>
                        <TD className="text-right">
                          <Link
                            href={`/students/${child.id}`}
                            className="text-[12px] font-medium text-primary hover:underline"
                          >
                            Open
                          </Link>
                        </TD>
                        <TD className="text-right">
                          <Link
                            href={`/students/${child.id}/report-card`}
                            className="text-[12px] font-medium text-primary hover:underline"
                          >
                            View
                          </Link>
                        </TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <ParentGradesTable linkedChildren={children} />
              </>
            )}
          </section>
        </ViewSection>
      ) : null}

      {role === 'parent' && schoolId && children.length > 0 ? (
        <ViewSection id="parent_feed" title="Family feed">
          <ParentFeedSection parentId={user.id} schoolId={schoolId} students={children} />
        </ViewSection>
      ) : null}

      {role === 'parent' && schoolId ? (
        <ViewSection id="parent_feedback" title="Weekly parent feedback">
          <ParentExperienceFeedback
            initialResponse={initialParentFeedback}
            unavailable={parentFeedbackUnavailable}
          />
        </ViewSection>
      ) : null}

      <ViewSection id="announcements" title="Announcements">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[13px] font-medium text-foreground">Announcements</p>
            <Link href="/announcements" className="text-[12px] font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          {announcements.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No announcements yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Title</TH>
                  <TH>Audience</TH>
                  <TH className="text-right">Date</TH>
                </TR>
              </THead>
              <TBody>
                {announcements.map((a) => (
                  <TR key={a.id}>
                    <TD>
                      <Link href={`/announcements/${a.id}`} className="block hover:text-primary">
                        <span className="font-medium text-foreground">{a.title}</span>
                        <span className="mt-0.5 block line-clamp-1 text-[12px] text-muted-foreground">
                          {a.body}
                        </span>
                      </Link>
                    </TD>
                    <TD className="text-muted-foreground">{a.audience}</TD>
                    <TD className="text-right whitespace-nowrap text-[12px] text-muted-foreground">
                      {a.published_at ? format(new Date(a.published_at), 'MMM d, yyyy') : '—'}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>
      </ViewSection>
    </ConfigurableView>
  )
}

async function ParentFeedSection({
  parentId,
  schoolId,
  students,
}: {
  parentId: string
  schoolId: string
  students: { id: string; first_name: string; last_name: string }[]
}) {
  const items = await buildParentFeed(parentId, schoolId, students)
  return <ParentFeed items={items} />
}

async function ParentGradesTable({
  linkedChildren,
}: {
  linkedChildren: { id: string; first_name: string; last_name: string }[]
}) {
  const admin = createAdminClient()
  const rows: {
    studentId: string
    studentName: string
    classId: string
    className: string
    overall: number | null
    letter: string | null
  }[] = []

  for (const child of linkedChildren) {
    const { data: enrollments } = await admin
      .from('enrollments')
      .select('class_id')
      .eq('student_id', child.id)
    const classIds = (enrollments ?? []).map((e) => e.class_id)
    if (!classIds.length) continue

    const { data: classes } = await admin.from('classes').select('id, name').in('id', classIds)
    if (!classes?.length) continue

    for (const c of classes) {
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
          .eq('student_id', child.id)
          .in('assignment_id', ids)
        grades = (data ?? []) as Grade[]
      }
      const result = calculateTransparentGrade(cats, assignments, grades)
      rows.push({
        studentId: child.id,
        studentName: `${child.last_name}, ${child.first_name}`,
        classId: c.id,
        className: c.name,
        overall: result.overall,
        letter: result.letter,
      })
    }
  }

  if (!rows.length) {
    return (
      <p className="text-[12px] text-muted-foreground">No class enrollments with grades yet.</p>
    )
  }

  return (
    <div className="space-y-1.5">
      <p className="text-[12px] font-medium text-muted-foreground">Grades by class</p>
      <Table>
        <THead>
          <TR>
            <TH>Student</TH>
            <TH>Class</TH>
            <TH className="text-right">Grade</TH>
            <TH className="text-right" />
          </TR>
        </THead>
        <TBody>
          {rows.map((r) => (
            <TR key={`${r.studentId}-${r.classId}`}>
              <TD className="text-muted-foreground">{r.studentName}</TD>
              <TD>{r.className}</TD>
              <TD className="text-right tabular-nums font-medium">
                {r.overall != null ? `${r.overall}%` : '—'}
                {r.letter ? ` ${r.letter}` : ''}
              </TD>
              <TD className="text-right">
                <Link
                  href={`/classes/${r.classId}/students/${r.studentId}`}
                  className="text-[12px] font-medium text-primary hover:underline"
                >
                  Detail
                </Link>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  )
}

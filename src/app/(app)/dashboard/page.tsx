import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowUpRight, BookOpen } from 'lucide-react'
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
import { MissingWorkRadar } from '@/components/insights/MissingWorkRadar'
import { TeacherTodayCard } from '@/components/insights/TeacherTodayCard'
import { ConfigurableView } from '@/components/view-prefs/ConfigurableView'
import { ViewSection } from '@/components/view-prefs/ViewSection'
import { loadScreenLayout } from '@/lib/view-prefs/store'
import { PageHeader } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { buttonClassName } from '@/components/ui/button'
import type { Assignment, Grade, GradeCategory } from '@/lib/types'

export default async function DashboardPage() {
  const { profile, user } = await getProfile()
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

  type Child = {
    id: string
    first_name: string
    last_name: string
    grade_level: string | null
  }
  let children: Child[] = []
  if (role === 'parent') {
    const { data: links } = await admin
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', user.id)
    const ids = (links ?? []).map((l) => l.student_id)
    if (ids.length) {
      const { data } = await admin
        .from('students')
        .select('id, first_name, last_name, grade_level')
        .in('id', ids)
      children = (data ?? []) as Child[]
    }
  }

  let announcements: {
    id: string
    title: string
    body: string
    audience: string
    published_at: string | null
  }[] = []
  if (schoolId) {
    let aq = admin
      .from('announcements')
      .select('id, title, body, audience, published_at')
      .eq('school_id', schoolId)
      .order('published_at', { ascending: false })
      .limit(5)
    if (role === 'parent') {
      aq = aq.in('audience', ['parents', 'all'])
    }
    const { data } = await aq
    announcements = data ?? []
  }

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

  let parentInvoices: Awaited<
    ReturnType<typeof import('@/lib/billing/invoice-email').listOpenInvoicesForParentEmail>
  > = []
  if (role === 'parent' && schoolId && user.email) {
    try {
      const { listOpenInvoicesForParentEmail } = await import('@/lib/billing/invoice-email')
      parentInvoices = await listOpenInvoicesForParentEmail(schoolId, user.email)
    } catch {
      parentInvoices = []
    }
  }

  const presentSectionIds = [
    'header',
    'announcements',
    ...(showQuick ? (['quick_mobile'] as const) : []),
    ...(isPrincipal ? (['principal_banner'] as const) : []),
    ...(teacherToday ? (['teacher_today'] as const) : []),
    ...(isStaffHome ? (['classes'] as const) : []),
    ...(role === 'parent' && schoolId ? (['parent_billing'] as const) : []),
    ...(role === 'parent' && parentMissing.length > 0 ? (['parent_missing'] as const) : []),
    ...(role === 'parent' ? (['children'] as const) : []),
    ...(role === 'parent' && schoolId && children.length > 0
      ? (['parent_feed'] as const)
      : []),
  ]

  const viewLayout = await loadScreenLayout(user.id, 'dashboard', [...presentSectionIds])

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
            className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-primary px-4 py-3.5 text-primary-foreground shadow-[var(--shadow-lift)] sm:hidden"
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

      {isPrincipal ? (
        <ViewSection id="principal_banner" title="Principal welcome">
          <Card className="overflow-hidden border-primary/15">
            <CardContent className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
                  Principal
                </p>
                <p className="mt-0.5 text-lg font-semibold tracking-tight">
                  Leadership workspace
                </p>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  Academics, families, tuition, and go-live — finish trust before wider rollout.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href="/principal" className={buttonClassName('primary', 'sm')}>
                  Open office
                </Link>
                <Link href="/principal/release" className={buttonClassName('outline', 'sm')}>
                  Go-live
                </Link>
              </div>
            </CardContent>
          </Card>
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
                  Quick mode
                </Link>
                <Link href="/announcements/new" className={buttonClassName('outline', 'sm')}>
                  Announce
                </Link>
              </>
            ) : undefined
          }
        />
      </ViewSection>

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
          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-lg font-semibold tracking-tight">Classes</h2>
              {classes.length > 0 ? (
                <Link
                  href="/teacher/classroom"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Manage classroom
                </Link>
              ) : null}
            </div>
            {classes.length === 0 ? (
              <EmptyState
                tone="primary"
                title="No classes yet"
                description="Create subjects, add students, and run grades. Deletions need principal approval."
                action={
                  <Link href="/teacher/classroom" className={buttonClassName('primary', 'sm')}>
                    Open classroom
                  </Link>
                }
              />
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {classes.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/classes/${c.id}`}
                      className="card-interactive group flex h-full flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 transition group-hover:opacity-100" />
                      </div>
                      <p className="mt-3 font-semibold tracking-tight">{c.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {[c.subject, c.grade_level, c.term].filter(Boolean).join(' · ') || 'Class'}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        {rosterCount.get(c.id) || 0} students
                      </p>
                      <span className="mt-3 text-xs font-semibold text-primary">Open gradebook</span>
                    </Link>
                  </li>
                ))}
              </ul>
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
          <section className="space-y-3">
            <h2 className="text-lg font-semibold tracking-tight">Your children</h2>
            {children.length === 0 ? (
              <EmptyState title="No students linked" description="Ask the school to link your children to this account." />
            ) : (
              <ul className="space-y-3">
                {children.map((child) => (
                  <li key={child.id}>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {child.last_name}, {child.first_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {child.grade_level || 'Student'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Link
                              href={`/students/${child.id}`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              Overview
                            </Link>
                            <Link
                              href={`/students/${child.id}/report-card`}
                              className="text-sm font-medium text-primary hover:underline"
                            >
                              Report card
                            </Link>
                          </div>
                        </div>
                        <ParentClassLinksWithGrades studentId={child.id} />
                      </CardContent>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </ViewSection>
      ) : null}

      {role === 'parent' && schoolId && children.length > 0 ? (
        <ViewSection id="parent_feed" title="Family feed">
          <ParentFeedSection parentId={user.id} schoolId={schoolId} students={children} />
        </ViewSection>
      ) : null}

      <ViewSection id="announcements" title="Announcements">
        <Card className="max-w-2xl">
          <CardContent className="pt-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-semibold tracking-tight">Announcements</h2>
              <Link href="/announcements" className="text-xs font-medium text-primary hover:underline">
                View all
              </Link>
            </div>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              <ul className="divide-y divide-border/70">
                {announcements.map((a) => (
                  <li key={a.id} className="py-3 first:pt-0 last:pb-0">
                    <Link href={`/announcements/${a.id}`} className="block group">
                      <p className="text-sm font-medium group-hover:text-primary">{a.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {a.published_at ? format(new Date(a.published_at), 'MMM d') : ''}
                        {' · '}
                        {a.audience}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
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

async function ParentClassLinksWithGrades({ studentId }: { studentId: string }) {
  const admin = createAdminClient()
  const { data: enrollments } = await admin
    .from('enrollments')
    .select('class_id')
    .eq('student_id', studentId)

  const classIds = (enrollments ?? []).map((e) => e.class_id)
  if (!classIds.length) {
    return <p className="mt-2 text-xs text-muted-foreground">No class enrollments.</p>
  }

  const { data: classes } = await admin.from('classes').select('id, name').in('id', classIds)
  if (!classes?.length) {
    return <p className="mt-2 text-xs text-muted-foreground">No class enrollments.</p>
  }

  const cards = await Promise.all(
    classes.map(async (c) => {
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
      return { ...c, overall: result.overall, letter: result.letter }
    })
  )

  return (
    <ul className="mt-3 space-y-2">
      {cards.map((c) => (
        <li key={c.id}>
          <Link
            href={`/classes/${c.id}/students/${studentId}`}
            className="flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm transition hover:border-primary/30 hover:bg-primary/5"
          >
            <span className="font-medium">{c.name}</span>
            <span className="tabular-nums font-semibold text-foreground">
              {c.overall != null ? `${c.overall}%` : '—'}
              {c.letter ? ` ${c.letter}` : ''}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

import Link from 'next/link'
import { format } from 'date-fns'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { calculateTransparentGrade } from '@/lib/grades'
import { buildParentFeed } from '@/lib/parent-feed'
import { ParentFeed } from '@/components/parent/ParentFeed'
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
          <code className="text-xs bg-amber-100 px-1 rounded">profiles</code> for your user id.
        </p>
      </div>
    )
  }

  const role = profile.role
  const schoolId = profile.school_id

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
  } else if (role === 'admin' || role === 'staff' || role === 'principal') {
    let q = admin
      .from('classes')
      .select('id, name, subject, grade_level, term, teacher_id')
      .eq('active', true)
      .order('name')
    if (schoolId) q = q.eq('school_id', schoolId)
    const { data } = await q
    classes = data ?? []
  }

  // Roster counts per class
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

  // Recent announcements
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

  return (
    <div className="space-y-8">
      {isPrincipal && (
        <div className="rounded-2xl border border-sky-200 bg-gradient-to-r from-navy via-slate-900 to-sky-900 px-5 py-5 text-white shadow-[var(--shadow-lift)]">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">
            Principal access
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight">
            Welcome, Chris — this login is just for you
          </h2>
          <p className="mt-2 text-sm text-slate-300 max-w-2xl leading-relaxed">
            Full Beacon suite: academics, families, communications, tuition, and QuickBooks.
            Built under your direction for Lighthouse.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/principal"
              className="rounded-lg bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-sky-400"
            >
              Open principal office
            </Link>
            <Link
              href="/principal/payments"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15"
            >
              Payments & QuickBooks
            </Link>
            <Link
              href="/about"
              className="rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/15"
            >
              About Beacon
            </Link>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome{profile.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {role === 'parent'
              ? 'Your family’s home in Beacon — announcements, grades, and class links.'
              : isPrincipal
                ? 'School-wide hub for Lighthouse Christian Academy.'
                : 'Your home in the Beacon school suite.'}
          </p>
        </div>
        {canPost && (
          <div className="flex flex-wrap gap-2">
            <Link
              href="/announcements/new"
              className="rounded-lg bg-sky-600 text-white px-3 py-2 text-sm font-semibold"
            >
              New announcement
            </Link>
            <Link
              href="/admin/emails"
              className="rounded-lg border bg-background px-3 py-2 text-sm font-medium"
            >
              Email outbox
            </Link>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          {(role === 'teacher' || role === 'admin' || role === 'staff' || role === 'principal') && (
            <section>
              <h2 className="text-lg font-semibold mb-3">Classes</h2>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground rounded-xl border bg-background p-4">
                  No classes yet.
                </p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {classes.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/classes/${c.id}`}
                        className="card-interactive block h-full rounded-2xl border border-border/80 bg-card p-5 shadow-[var(--shadow-soft)]"
                      >
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {[c.subject, c.grade_level, c.term].filter(Boolean).join(' · ') ||
                            'Class'}
                        </p>
                        <p className="text-xs text-sky-800 mt-3 font-medium">
                          {rosterCount.get(c.id) || 0} students · Open class →
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {role === 'parent' && (
            <>
              <section>
                <h2 className="text-lg font-semibold mb-3">Your children</h2>
                {children.length === 0 ? (
                  <p className="text-sm text-muted-foreground rounded-xl border bg-background p-4">
                    No students linked.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {children.map((child) => (
                      <li key={child.id} className="rounded-2xl border bg-card p-4 shadow-[var(--shadow-soft)]">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-semibold">
                              {child.last_name}, {child.first_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {child.grade_level || 'Student'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Link
                              href={`/students/${child.id}`}
                              className="text-sm font-medium text-sky-700 hover:underline"
                            >
                              Overview →
                            </Link>
                            <Link
                              href={`/students/${child.id}/report-card`}
                              className="text-sm font-medium text-sky-700 hover:underline"
                            >
                              Report card →
                            </Link>
                          </div>
                        </div>
                        <ParentClassLinksWithGrades studentId={child.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              {schoolId && children.length > 0 && (
                <section className="mt-8">
                  <ParentFeedSection
                    parentId={user.id}
                    schoolId={schoolId}
                    children={children}
                  />
                </section>
              )}
            </>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border bg-background p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Announcements</h2>
              <Link href="/announcements" className="text-xs font-medium text-sky-700 hover:underline">
                View all
              </Link>
            </div>
            {announcements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No announcements yet.</p>
            ) : (
              <ul className="space-y-3">
                {announcements.map((a) => (
                  <li key={a.id}>
                    <Link href={`/announcements/${a.id}`} className="block group">
                      <p className="font-medium text-sm group-hover:text-sky-700">{a.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{a.body}</p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {a.published_at
                          ? format(new Date(a.published_at), 'MMM d')
                          : ''}
                        {' · '}
                        {a.audience}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {canPost && (
            <section className="rounded-xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-950">
              <p className="font-semibold">Quick tips</p>
              <ul className="mt-2 space-y-1 text-sky-900/90 list-disc ml-4">
                <li>Classes · setup · transparent grades</li>
                <li>Announcements &amp; family email</li>
                <li>Principal office · tuition · QuickBooks</li>
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}

async function ParentFeedSection({
  parentId,
  schoolId,
  children,
}: {
  parentId: string
  schoolId: string
  children: { id: string; first_name: string; last_name: string }[]
}) {
  const items = await buildParentFeed(parentId, schoolId, children)
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
    return <p className="text-xs text-muted-foreground mt-2">No class enrollments.</p>
  }

  const { data: classes } = await admin.from('classes').select('id, name').in('id', classIds)
  if (!classes?.length) {
    return <p className="text-xs text-muted-foreground mt-2">No class enrollments.</p>
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
            className="flex items-center justify-between gap-2 rounded-lg bg-sky-50 text-sky-950 border border-sky-100 px-3 py-2 text-sm hover:bg-sky-100"
          >
            <span className="font-medium">{c.name}</span>
            <span className="tabular-nums font-semibold">
              {c.overall != null ? `${c.overall}%` : '—'}
              {c.letter ? ` ${c.letter}` : ''}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSchoolStaff } from '@/lib/roles'
import { loadSchoolBrand } from '@/lib/school-brand'
import { BirthdayCouponBook } from '@/components/printables/BirthdayCouponBook'
import { WeeklyScoreReport } from '@/components/printables/WeeklyScoreReport'
import {
  loadScoreReportBundle,
  type ScoreReportBundle,
  type ScoreReportClassOption,
} from '@/app/actions/printables'

export default async function TeacherPrintablesPage() {
  const { profile, user } = await getProfile()
  if (!profile || !isSchoolStaff(profile.role)) {
    redirect('/dashboard')
  }

  const brand = await loadSchoolBrand(profile.school_id)
  const admin = createAdminClient()

  let classes: ScoreReportClassOption[] = []
  if (profile.role === 'teacher') {
    const { data } = await admin
      .from('classes')
      .select('id, name, subject, grade_level')
      .eq('teacher_id', user.id)
      .eq('active', true)
      .order('name')
    classes = (data ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      subject: (c.subject as string | null) ?? null,
      gradeLevel: (c.grade_level as string | null) ?? null,
    }))
  } else if (profile.school_id) {
    const { data } = await admin
      .from('classes')
      .select('id, name, subject, grade_level')
      .eq('school_id', profile.school_id)
      .eq('active', true)
      .order('name')
    classes = (data ?? []).map((c) => ({
      id: c.id as string,
      name: c.name as string,
      subject: (c.subject as string | null) ?? null,
      gradeLevel: (c.grade_level as string | null) ?? null,
    }))
  }

  let initialBundle: ScoreReportBundle | null = null
  if (classes[0]) {
    const result = await loadScoreReportBundle(classes[0].id)
    if (result.ok) initialBundle = result.data
  }

  const teacherName = profile.full_name || ''

  return (
    <div className="space-y-10">
      <div className="print:hidden space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">
          <Link href="/dashboard" className="hover:underline">
            Dashboard
          </Link>
          {' / '}
          Teacher printables
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-navy dark:text-sky-50">
          Teacher printables
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Low-prep classroom printables — birthday gifts, send-home score sheets, and more
          freebies as we grow this shelf.
        </p>
        <nav className="flex flex-wrap gap-2 pt-1" aria-label="Printable sections">
          <a
            href="#score-sheets"
            className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-900 hover:bg-sky-100"
          >
            Weekly score sheets
          </a>
          <a
            href="#birthday-coupons"
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-950 hover:bg-amber-100"
          >
            Birthday Coupon Book
          </a>
        </nav>
      </div>

      <section id="score-sheets" className="scroll-mt-24">
        <WeeklyScoreReport
          classes={classes}
          initialBundle={initialBundle}
          defaultTeacherName={teacherName}
          schoolName={brand.name}
        />
      </section>

      <hr className="print:hidden border-border/70" />

      <section id="birthday-coupons" className="scroll-mt-24">
        <BirthdayCouponBook
          defaultTeacherName={teacherName}
          schoolName={brand.name}
        />
      </section>
    </div>
  )
}

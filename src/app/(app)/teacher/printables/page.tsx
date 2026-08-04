import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isSchoolStaff } from '@/lib/roles'
import { loadSchoolBrand } from '@/lib/school-brand'
import { BirthdayCouponBook } from '@/components/printables/BirthdayCouponBook'
import { WeeklyScoreReport } from '@/components/printables/WeeklyScoreReport'
import { ConfigurableView } from '@/components/view-prefs/ConfigurableView'
import { ViewSection } from '@/components/view-prefs/ViewSection'
import {
  loadScoreReportBundle,
  type ScoreReportBundle,
  type ScoreReportClassOption,
} from '@/app/actions/printables'
import { loadScreenLayout } from '@/lib/view-prefs/store'

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
  const viewLayout = await loadScreenLayout(user.id, 'teacher_printables', [
    'hub_header',
    'score_sheets',
    'birthday_coupons',
  ])

  return (
    <ConfigurableView screenId="teacher_printables" initialLayout={viewLayout}>
      <ViewSection id="hub_header" title="Printables header" locked>
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
            freebies as we grow this shelf. Use <strong>Edit view</strong> to show only the tools
            you use.
          </p>
        </div>
      </ViewSection>

      <ViewSection
        id="score_sheets"
        title="Weekly test & quiz score sheets"
        description="Parent signature send-home"
      >
        <div id="score-sheets">
          <WeeklyScoreReport
            classes={classes}
            initialBundle={initialBundle}
            defaultTeacherName={teacherName}
            schoolName={brand.name}
          />
        </div>
      </ViewSection>

      <ViewSection
        id="birthday_coupons"
        title="Birthday Coupon Book"
        description="Student birthday freebies"
      >
        <div id="birthday-coupons">
          <BirthdayCouponBook defaultTeacherName={teacherName} schoolName={brand.name} />
        </div>
      </ViewSection>
    </ConfigurableView>
  )
}

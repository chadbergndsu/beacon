import { requirePrincipal } from '@/lib/principal'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadSchoolBrand } from '@/lib/school-brand'
import {
  RosterHub,
  type RosterClass,
  type RosterPerson,
  type RosterStudent,
} from '@/components/roster/RosterHub'

export default async function PrincipalRosterPage() {
  const { schoolId } = await requirePrincipal()
  const admin = createAdminClient()
  const brand = await loadSchoolBrand(schoolId)

  const [
    { data: studentRows },
    { data: profileRows },
    { data: classRows },
    { data: enrollRows },
  ] = await Promise.all([
    admin
      .from('students')
      .select('id, first_name, last_name, grade_level, active')
      .eq('school_id', schoolId)
      .eq('active', true)
      .order('last_name')
      .order('first_name'),
    admin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('school_id', schoolId)
      .in('role', ['teacher', 'parent', 'staff'])
      .order('full_name'),
    admin
      .from('classes')
      .select('id, name, subject, grade_level, teacher_id')
      .eq('school_id', schoolId)
      .eq('active', true)
      .order('name'),
    admin.from('enrollments').select('class_id, student_id'),
  ])

  const students = (studentRows ?? []) as RosterStudent[]
  const profiles = (profileRows ?? []) as RosterPerson[]
  const teachers = profiles.filter((p) => p.role === 'teacher' || p.role === 'staff')
  const parents = profiles.filter((p) => p.role === 'parent')

  const enrollByClass = new Map<string, number>()
  for (const e of enrollRows ?? []) {
    enrollByClass.set(e.class_id, (enrollByClass.get(e.class_id) || 0) + 1)
  }

  const classes: RosterClass[] = (classRows ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    subject: (c.subject as string | null) ?? null,
    grade_level: (c.grade_level as string | null) ?? null,
    teacher_id: (c.teacher_id as string | null) ?? null,
    enrollment_count: enrollByClass.get(c.id as string) || 0,
  }))

  // Parent links only for students at this school
  const studentIds = students.map((s) => s.id)
  let parentLinks: { parent_id: string; student_id: string }[] = []
  if (studentIds.length) {
    const { data: links } = await admin
      .from('parent_students')
      .select('parent_id, student_id')
      .in('student_id', studentIds)
    parentLinks = (links ?? []) as { parent_id: string; student_id: string }[]
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          School year setup
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy dark:text-sky-50">
          Roster
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Put real people in Beacon: teachers and parents you know (by email), then students and
          classes. Teachers can also own their own Abeka classes and students under{' '}
          <strong>My classroom</strong>. Deletions go through{' '}
          <a href="/principal/approvals" className="text-sky-700 underline">
            Approvals &amp; history
          </a>
          .
        </p>
      </div>

      <RosterHub
        schoolName={brand.name}
        students={students}
        teachers={teachers}
        parents={parents}
        classes={classes}
        parentLinks={parentLinks}
      />
    </div>
  )
}

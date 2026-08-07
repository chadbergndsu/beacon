import { requirePrincipal } from '@/lib/principal'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadSchoolBrand } from '@/lib/school-brand'
import {
  RosterHub,
  type RosterClass,
  type RosterPerson,
  type RosterStudent,
} from '@/components/roster/RosterHub'
import { PageHeader } from '@/components/ui/page-header'

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
    // Scoped to this school's classes only (not global enrollments)
    admin
      .from('enrollments')
      .select('class_id, student_id, classes!inner(school_id)')
      .eq('classes.school_id', schoolId),
  ])

  const students = (studentRows ?? []) as RosterStudent[]
  const profiles = (profileRows ?? []) as RosterPerson[]
  const teachers = profiles.filter((p) => p.role === 'teacher' || p.role === 'staff')
  const parents = profiles.filter((p) => p.role === 'parent')

  const enrollByClass = new Map<string, number>()
  for (const e of enrollRows ?? []) {
    const cid = e.class_id as string
    enrollByClass.set(cid, (enrollByClass.get(cid) || 0) + 1)
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
    <div className="page-stack">
      <PageHeader
        eyebrow="School year setup"
        title="Roster"
        description={
          <>
            Put real people in Beacon: teachers and parents you know (by email), then students and
            classes. Teachers can also own their own Abeka classes and students under{' '}
            <strong>My classroom</strong>. Deletions go through{' '}
            <a href="/principal/approvals" className="text-primary hover:underline">
              Approvals &amp; history
            </a>
            .
          </>
        }
      />

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

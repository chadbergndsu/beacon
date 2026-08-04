import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildGradesCsv } from '@/lib/export/grades-csv'
import type { Assignment, Grade, Student } from '@/lib/types'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const { classId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const [{ data: classRow }, { data: profile }] = await Promise.all([
    admin.from('classes').select('id, name, teacher_id, school_id').eq('id', classId).maybeSingle(),
    admin.from('profiles').select('role, school_id').eq('id', user.id).maybeSingle(),
  ])

  if (!classRow) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { canEnterGrades, effectiveRole } = await import('@/lib/roles')
  const role = effectiveRole(
    profile as { role: 'admin' | 'teacher' | 'parent' | 'staff' | 'principal'; email: string | null } | null
  )
  if (
    !canEnterGrades(role, classRow.teacher_id, user.id, {
      profileSchoolId: profile?.school_id as string | null,
      classSchoolId: classRow.school_id as string | null,
    })
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: enroll } = await admin
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)
  const studentIds = (enroll ?? []).map((e) => e.student_id)

  let students: Student[] = []
  if (studentIds.length) {
    const { data } = await admin
      .from('students')
      .select('*')
      .in('id', studentIds)
      .order('last_name')
    students = (data ?? []) as Student[]
  }

  const { data: assignmentsData } = await admin
    .from('assignments')
    .select('*')
    .eq('class_id', classId)
    .order('due_date', { ascending: true, nullsFirst: false })
  const assignments = (assignmentsData ?? []) as Assignment[]

  const assignmentIds = assignments.map((a) => a.id)
  let grades: Grade[] = []
  if (assignmentIds.length) {
    const { data } = await admin.from('grades').select('*').in('assignment_id', assignmentIds)
    grades = (data ?? []) as Grade[]
  }

  const csv = buildGradesCsv(classRow.name, students, assignments, grades)
  const filename = `${classRow.name.replace(/[^\w\-]+/g, '_')}_grades.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

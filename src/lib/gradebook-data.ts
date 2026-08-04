import { createAdminClient } from '@/lib/supabase/admin'
import type { Assignment, Grade, GradeCategory, Profile, Student } from '@/lib/types'
import type { User } from '@supabase/supabase-js'

export type ClassRow = {
  id: string
  name: string
  subject: string | null
  grade_level: string | null
  term: string | null
  teacher_id: string | null
  school_id: string
  active: boolean | null
}

function canAccessClass(profile: Profile | null, user: User, classRow: ClassRow) {
  if (!profile) return false
  if (profile.role === 'admin' || profile.role === 'staff' || profile.role === 'principal') {
    return !profile.school_id || profile.school_id === classRow.school_id
  }
  // Teachers only their classes — not whole-school browse (FACTS-style leak risk)
  if (profile.role === 'teacher') {
    return classRow.teacher_id === user.id
  }
  if (profile.role === 'parent') {
    // Parent access checked via enrollment + parent_students in caller
    return true
  }
  return false
}

export async function loadClassForUser(
  classId: string,
  user: User,
  profile: Profile | null
): Promise<ClassRow | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('classes')
    .select('id, name, subject, grade_level, term, teacher_id, school_id, active, call_number')
    .eq('id', classId)
    .maybeSingle()

  if (!data) return null
  const classRow = data as ClassRow

  if (profile?.role === 'parent') {
    const { data: links } = await admin
      .from('parent_students')
      .select('student_id')
      .eq('parent_id', user.id)
    const childIds = (links ?? []).map((l) => l.student_id)
    if (!childIds.length) return null
    const { data: enroll } = await admin
      .from('enrollments')
      .select('student_id')
      .eq('class_id', classId)
      .in('student_id', childIds)
      .limit(1)
    if (!enroll?.length) return null
    return classRow
  }

  if (!canAccessClass(profile, user, classRow)) return null
  return classRow
}

export async function loadClassRoster(classId: string): Promise<Student[]> {
  const admin = createAdminClient()
  const { data: enrollmentRows } = await admin
    .from('enrollments')
    .select('student_id')
    .eq('class_id', classId)

  const studentIds = (enrollmentRows ?? []).map((r) => r.student_id)
  if (!studentIds.length) return []

  const { data: students } = await admin
    .from('students')
    .select('*')
    .in('id', studentIds)
    .order('last_name')
    .order('first_name')

  return (students ?? []) as Student[]
}

export async function loadClassAssignments(classId: string): Promise<Assignment[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('assignments')
    .select('*')
    .eq('class_id', classId)
    .order('due_date', { ascending: true, nullsFirst: false })
  return (data ?? []) as Assignment[]
}

export async function loadClassCategories(classId: string): Promise<GradeCategory[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('grade_categories')
    .select('*')
    .eq('class_id', classId)
    .order('name')
  return (data ?? []) as GradeCategory[]
}

export async function loadGradesForAssignments(
  assignmentIds: string[],
  studentId?: string
): Promise<Grade[]> {
  if (!assignmentIds.length) return []
  const admin = createAdminClient()
  let q = admin.from('grades').select('*').in('assignment_id', assignmentIds)
  if (studentId) q = q.eq('student_id', studentId)
  const { data } = await q
  return (data ?? []) as Grade[]
}

export async function loadStudent(studentId: string): Promise<Student | null> {
  const admin = createAdminClient()
  const { data } = await admin.from('students').select('*').eq('id', studentId).maybeSingle()
  return (data as Student) ?? null
}

export async function parentCanViewStudent(parentId: string, studentId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('parent_students')
    .select('student_id')
    .eq('parent_id', parentId)
    .eq('student_id', studentId)
    .maybeSingle()
  return !!data
}

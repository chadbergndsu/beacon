'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { loadClassForUser, loadClassRoster } from '@/lib/gradebook-data'
import type { Profile } from '@/lib/types'
import type {
  ScoreReportAssignment,
  ScoreReportGrade,
  ScoreReportStudent,
} from '@/lib/printables/score-report'

export type ScoreReportClassOption = {
  id: string
  name: string
  subject: string | null
  gradeLevel: string | null
}

export type ScoreReportBundle = {
  classId: string
  className: string
  subject: string | null
  gradeLevel: string | null
  students: ScoreReportStudent[]
  assignments: ScoreReportAssignment[]
  grades: ScoreReportGrade[]
}

export async function loadScoreReportBundle(
  classId: string
): Promise<
  { ok: true; data: ScoreReportBundle } | { ok: false; error: string }
> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not signed in.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('id, school_id, role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  const classRow = await loadClassForUser(classId, user, profile as Profile | null)
  if (!classRow) {
    return { ok: false, error: 'Class not found or you do not have access.' }
  }

  const students = await loadClassRoster(classId)

  const { data: categories } = await admin
    .from('grade_categories')
    .select('id, name')
    .eq('class_id', classId)

  const catMap = new Map((categories ?? []).map((c) => [c.id as string, c.name as string]))

  const { data: assignmentRows } = await admin
    .from('assignments')
    .select('id, title, max_points, due_date, category_id')
    .eq('class_id', classId)
    .order('due_date', { ascending: true, nullsFirst: false })

  const assignments: ScoreReportAssignment[] = (assignmentRows ?? []).map((a) => ({
    id: a.id as string,
    title: (a.title as string) || 'Untitled',
    dueDate: (a.due_date as string | null) ?? null,
    maxPoints: Number(a.max_points) > 0 ? Number(a.max_points) : 100,
    categoryName: a.category_id ? catMap.get(a.category_id as string) ?? null : null,
  }))

  const assignmentIds = assignments.map((a) => a.id)
  let grades: ScoreReportGrade[] = []
  if (assignmentIds.length) {
    const { data: gradeRows } = await admin
      .from('grades')
      .select('assignment_id, student_id, score, is_missing')
      .in('assignment_id', assignmentIds)
    grades = (gradeRows ?? []).map((g) => ({
      assignmentId: g.assignment_id as string,
      studentId: g.student_id as string,
      score: g.score === null || g.score === undefined ? null : Number(g.score),
      isMissing: Boolean(g.is_missing),
    }))
  }

  return {
    ok: true,
    data: {
      classId: classRow.id,
      className: classRow.name,
      subject: classRow.subject,
      gradeLevel: classRow.grade_level,
      students: students.map((s) => ({
        id: s.id,
        firstName: s.first_name,
        lastName: s.last_name,
        gradeLevel: s.grade_level,
      })),
      assignments,
      grades,
    },
  }
}

import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveRole, isLeadership, isSchoolStaff } from '@/lib/roles'
import { listRosterRevisions } from '@/lib/roster/revisions'
import {
  TeacherClassroomHub,
  type TeacherClass,
  type TeacherStudent,
} from '@/components/roster/TeacherClassroomHub'
import type { Role } from '@/lib/types'

export default async function TeacherClassroomPage() {
  const { profile, user } = await getProfile()
  if (!profile) redirect('/login')

  const role = effectiveRole({
    role: profile.role as Role,
    email: profile.email,
  })

  if (!role || !isSchoolStaff(role)) {
    redirect('/dashboard')
  }

  // Leadership can still use principal roster; teachers land here
  if (isLeadership(role) && role !== 'staff') {
    // staff can use teacher tools; principal might prefer full roster
  }

  const admin = createAdminClient()
  const schoolId = profile.school_id
  if (!schoolId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h1 className="font-bold">No school on your profile</h1>
        <p className="mt-2 text-sm">Ask the principal to attach your account to a school.</p>
      </div>
    )
  }

  const isTeacherOnly = role === 'teacher'

  let classQuery = admin
    .from('classes')
    .select('id, name, subject, grade_level, teacher_id, call_number')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('name')

  if (isTeacherOnly) {
    classQuery = classQuery.eq('teacher_id', user.id)
  }

  type ClassRow = {
    id: string
    name: string
    subject: string | null
    grade_level: string | null
    teacher_id: string | null
    call_number?: string | null
  }
  let classesRaw: ClassRow[] = []
  const { data: classRows, error: classErr } = await classQuery
  if (classErr && /call_number|column/i.test(classErr.message)) {
    let fallback = admin
      .from('classes')
      .select('id, name, subject, grade_level, teacher_id')
      .eq('school_id', schoolId)
      .eq('active', true)
      .order('name')
    if (isTeacherOnly) fallback = fallback.eq('teacher_id', user.id)
    const r = await fallback
    classesRaw = (r.data ?? []) as ClassRow[]
  } else {
    classesRaw = (classRows ?? []) as ClassRow[]
  }
  const classIds = classesRaw.map((c) => c.id)

  const enrollCount = new Map<string, number>()
  const studentClassMap = new Map<string, string[]>()
  if (classIds.length) {
    const { data: enroll } = await admin
      .from('enrollments')
      .select('class_id, student_id')
      .in('class_id', classIds)
    for (const e of enroll ?? []) {
      const cid = e.class_id as string
      const sid = e.student_id as string
      enrollCount.set(cid, (enrollCount.get(cid) || 0) + 1)
      const arr = studentClassMap.get(sid) || []
      arr.push(cid)
      studentClassMap.set(sid, arr)
    }
  }

  const studentIds = [...studentClassMap.keys()]
  let students: TeacherStudent[] = []
  if (studentIds.length) {
    const { data: st } = await admin
      .from('students')
      .select('id, first_name, last_name, grade_level')
      .in('id', studentIds)
      .eq('active', true)
      .order('last_name')
    students = (st ?? []).map((s) => ({
      id: s.id as string,
      first_name: s.first_name as string,
      last_name: s.last_name as string,
      grade_level: (s.grade_level as string) || null,
      class_ids: studentClassMap.get(s.id as string) || [],
    }))
  }

  const classes: TeacherClass[] = classesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    subject: c.subject || null,
    grade_level: c.grade_level || null,
    call_number: c.call_number ? String(c.call_number) : null,
    enrollment_count: enrollCount.get(c.id) || 0,
  }))

  let revisions = await listRosterRevisions(admin, schoolId, 40)
  if (isTeacherOnly) {
    revisions = revisions.filter((r) => r.actorId === user.id)
  }

  let pendingRequests: {
    id: string
    kind: string
    entityLabel: string
    status: string
    createdAt: string
  }[] = []
  try {
    const { data: approvalRows, error: apprErr } = await admin
      .from('approval_requests')
      .select('id, kind, entity_label, status, created_at')
      .eq('school_id', schoolId)
      .eq('requested_by', user.id)
      .order('created_at', { ascending: false })
      .limit(20)
    if (!apprErr) {
      pendingRequests = (approvalRows ?? []).map((r) => ({
        id: String(r.id),
        kind: String(r.kind),
        entityLabel: String(r.entity_label || ''),
        status: String(r.status),
        createdAt: String(r.created_at),
      }))
    }
  } catch {
    // tables may not exist until pending-013
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
          Teacher tools
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy dark:text-sky-50">
          My classroom
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground leading-relaxed">
          Own your Abeka classes and roster. Principals still approve deletions and can restore
          anything school-wide.
        </p>
      </div>

      <TeacherClassroomHub
        teacherName={profile.full_name || ''}
        classes={classes}
        students={students}
        revisions={revisions}
        pendingRequests={pendingRequests}
      />
    </div>
  )
}

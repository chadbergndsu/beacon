import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getProfile } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { effectiveRole, isSchoolStaff } from '@/lib/roles'
import {
  TeacherSettingsHub,
  type SettingsClassRow,
} from '@/components/teacher/TeacherSettingsHub'
import { loadUserPreferences } from '@/lib/view-prefs/store'
import {
  DEFAULT_SKIN,
  SKIN_COOKIE,
  parseSkinId,
} from '@/lib/skins/catalog'
import type { Role } from '@/lib/types'
import { PageHeader } from '@/components/ui/page-header'

export default async function TeacherSettingsPage() {
  const { profile, user } = await getProfile()
  if (!profile) redirect('/login')

  const role = effectiveRole({
    role: profile.role as Role,
    email: profile.email,
  })
  if (!role || !isSchoolStaff(role)) redirect('/dashboard')

  const schoolId = profile.school_id
  if (!schoolId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
        <h1 className="font-bold">No school on your profile</h1>
      </div>
    )
  }

  const admin = createAdminClient()
  const isTeacherOnly = role === 'teacher'

  let classQuery = admin
    .from('classes')
    .select('id, name, subject, grade_level')
    .eq('school_id', schoolId)
    .eq('active', true)
    .order('name')
  if (isTeacherOnly) {
    classQuery = classQuery.eq('teacher_id', user.id)
  }
  const { data: classRows } = await classQuery
  const classIds = (classRows ?? []).map((c) => c.id as string)

  const enrollCount = new Map<string, number>()
  const categoriesByClass = new Map<
    string,
    { id: string; name: string; weight: number; drop_lowest: number }[]
  >()

  if (classIds.length) {
    const [{ data: enroll }, { data: cats }] = await Promise.all([
      admin.from('enrollments').select('class_id').in('class_id', classIds),
      admin
        .from('grade_categories')
        .select('id, class_id, name, weight, drop_lowest')
        .in('class_id', classIds)
        .order('name'),
    ])
    for (const e of enroll ?? []) {
      const id = e.class_id as string
      enrollCount.set(id, (enrollCount.get(id) || 0) + 1)
    }
    for (const c of cats ?? []) {
      const id = c.class_id as string
      const arr = categoriesByClass.get(id) || []
      arr.push({
        id: c.id as string,
        name: c.name as string,
        weight: Number(c.weight) || 0,
        drop_lowest: Number(c.drop_lowest) || 0,
      })
      categoriesByClass.set(id, arr)
    }
  }

  const classes: SettingsClassRow[] = (classRows ?? []).map((c) => ({
    id: c.id as string,
    name: c.name as string,
    subject: (c.subject as string) || null,
    grade_level: (c.grade_level as string) || null,
    studentCount: enrollCount.get(c.id as string) || 0,
    categories: categoriesByClass.get(c.id as string) || [],
  }))

  const jar = await cookies()
  let skin = parseSkinId(jar.get(SKIN_COOKIE)?.value || DEFAULT_SKIN)
  const prefs = await loadUserPreferences(user.id)
  if (prefs.skin) skin = parseSkinId(prefs.skin)

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        description="Your classroom control center: skins, students, classes, grade weights, and shortcuts into every gradebook."
      />

      <TeacherSettingsHub
        teacherName={profile.full_name || ''}
        classes={classes}
        currentSkin={skin}
      />
    </div>
  )
}

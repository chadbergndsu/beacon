/**
 * First-run school onboarding completeness.
 * Senior approach: measurable setup steps, not a marketing wizard with dead ends.
 */

import { createAdminClient } from '@/lib/supabase/admin'

export type OnboardingStep = {
  id: string
  label: string
  done: boolean
  href: string
  detail: string
}

export type OnboardingStatus = {
  complete: number
  total: number
  percent: number
  steps: OnboardingStep[]
  readyForParents: boolean
}

export async function loadSchoolOnboarding(schoolId: string): Promise<OnboardingStatus> {
  const admin = createAdminClient()

  const [
    { data: school },
    { count: students },
    { count: teachers },
    { count: classes },
    { count: parents },
    { count: links },
    { count: assignments },
  ] = await Promise.all([
    admin.from('schools').select('id, name, settings').eq('id', schoolId).maybeSingle(),
    admin
      .from('students')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('active', true),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'teacher'),
    admin
      .from('classes')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('active', true),
    admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('role', 'parent'),
    admin.from('parent_students').select('*', { count: 'exact', head: true }),
    admin.from('assignments').select('*', { count: 'exact', head: true }),
  ])

  const settings = (school?.settings || {}) as { brand?: { mission?: string; websiteUrl?: string } }
  const brandOk = Boolean(
    school?.name &&
      school.name !== 'Your School' &&
      (settings.brand?.mission || settings.brand?.websiteUrl)
  )

  // parent_students is global in schema — filter by school via students
  let schoolParentLinks = 0
  if ((links ?? 0) > 0) {
    const { data: studs } = await admin
      .from('students')
      .select('id')
      .eq('school_id', schoolId)
    const ids = (studs ?? []).map((s) => s.id)
    if (ids.length) {
      const { count } = await admin
        .from('parent_students')
        .select('*', { count: 'exact', head: true })
        .in('student_id', ids)
      schoolParentLinks = count ?? 0
    }
  }

  // assignments for school classes
  let schoolAssignments = 0
  const { data: classRows } = await admin
    .from('classes')
    .select('id')
    .eq('school_id', schoolId)
  const cids = (classRows ?? []).map((c) => c.id)
  if (cids.length) {
    const { count } = await admin
      .from('assignments')
      .select('*', { count: 'exact', head: true })
      .in('class_id', cids)
    schoolAssignments = count ?? 0
  }

  const steps: OnboardingStep[] = [
    {
      id: 'brand',
      label: 'School name & branding',
      done: brandOk,
      href: '/principal/release',
      detail: brandOk ? school!.name! : 'Set name, mission, and contact on Go-live',
    },
    {
      id: 'students',
      label: 'Add students',
      done: (students ?? 0) > 0,
      href: '/principal/roster',
      detail: `${students ?? 0} active students`,
    },
    {
      id: 'teachers',
      label: 'Teacher accounts',
      done: (teachers ?? 0) > 0,
      href: '/principal/roster',
      detail: `${teachers ?? 0} teacher profiles`,
    },
    {
      id: 'classes',
      label: 'Create classes',
      done: (classes ?? 0) > 0,
      href: '/principal/roster',
      detail: `${classes ?? 0} active classes`,
    },
    {
      id: 'assignments',
      label: 'At least one assignment',
      done: schoolAssignments > 0,
      href: '/dashboard',
      detail: schoolAssignments > 0 ? `${schoolAssignments} assignments` : 'Teachers need something to grade',
    },
    {
      id: 'parents',
      label: 'Parent links',
      done: schoolParentLinks > 0,
      href: '/principal/roster',
      detail:
        schoolParentLinks > 0
          ? `${schoolParentLinks} parent–student links`
          : 'Link parents so Dinner Table & grades work',
    },
    {
      id: 'badges',
      label: 'Badge / kiosk ready',
      done: false, // filled below after room probe
      href: '/principal/badges',
      detail: 'Assign badge codes and open room kiosk',
    },
  ]

  // Badge rooms table may be missing until 011
  let roomsOk = false
  try {
    const { error: roomsErr, count: roomCount } = await admin
      .from('school_rooms')
      .select('*', { count: 'exact', head: true })
      .eq('school_id', schoolId)
    roomsOk = !roomsErr && (roomCount ?? 0) > 0
  } catch {
    roomsOk = false
  }
  const badgeStep = steps.find((s) => s.id === 'badges')
  if (badgeStep) {
    badgeStep.done = roomsOk
    badgeStep.detail = roomsOk
      ? 'Rooms configured — open kiosk from Badges'
      : 'Run pending-011 + open Principal → Badges'
  }

  // silence unused
  void parents
  void assignments

  const complete = steps.filter((s) => s.done).length
  const total = steps.length
  const percent = Math.round((complete / total) * 100)
  const readyForParents =
    brandOk && (students ?? 0) > 0 && (classes ?? 0) > 0 && schoolParentLinks > 0

  return { complete, total, percent, steps, readyForParents }
}

/** Pure gate used by tests and docs — keep in sync with loadSchoolOnboarding. */
export function isParentPilotReady(input: {
  brandOk: boolean
  students: number
  classes: number
  parentLinks: number
}) {
  return input.brandOk && input.students > 0 && input.classes > 0 && input.parentLinks > 0
}

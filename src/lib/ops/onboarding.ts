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
  category: 'core' | 'optional'
}

export type OnboardingSummary = {
  complete: number
  total: number
  percent: number
  steps: OnboardingStep[]
}

export type OnboardingStatus = {
  core: OnboardingSummary
  optional: OnboardingSummary
  steps: OnboardingStep[]
}

export const PARENT_PILOT_APPROVAL_CHECKS = [
  'teacher_login',
  'parent_login',
  'phone_smoke',
  'email_mode',
  'ferpa_review',
  'soft_launch',
] as const

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
      category: 'core',
      done: brandOk,
      href: '/principal/release',
      detail: brandOk ? school!.name! : 'Set name, mission, and contact on Go-live',
    },
    {
      id: 'students',
      label: 'Add students',
      category: 'core',
      done: (students ?? 0) > 0,
      href: '/principal/roster',
      detail: `${students ?? 0} active students`,
    },
    {
      id: 'teachers',
      label: 'Teacher accounts',
      category: 'core',
      done: (teachers ?? 0) > 0,
      href: '/principal/roster',
      detail: `${teachers ?? 0} teacher profiles`,
    },
    {
      id: 'classes',
      label: 'Create classes',
      category: 'core',
      done: (classes ?? 0) > 0,
      href: '/principal/roster',
      detail: `${classes ?? 0} active classes`,
    },
    {
      id: 'assignments',
      label: 'At least one assignment',
      category: 'core',
      done: schoolAssignments > 0,
      href: '/dashboard',
      detail: schoolAssignments > 0 ? `${schoolAssignments} assignments` : 'Teachers need something to grade',
    },
    {
      id: 'parents',
      label: 'Parent links',
      category: 'core',
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
      category: 'optional',
      done: false, // filled below after room probe
      href: '/principal/badges',
      detail: 'Assign badge codes and open room kiosk',
    },
  ]

  // Badge tables may be missing until 011/015/018. Readiness is only true
  // when a school has a room, a usable student code, and a live kiosk link.
  let badgeReady = false
  try {
    const [roomsResult, badgesResult, tokenResult] = await Promise.all([
      admin
        .from('school_rooms')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId),
      admin
        .from('students')
        .select('*', { count: 'exact', head: true })
        .eq('school_id', schoolId)
        .eq('active', true)
        .not('badge_code', 'is', null),
      admin
        .from('school_access_tokens')
        .select('kiosk_token, kiosk_token_expires_at')
        .eq('school_id', schoolId)
        .maybeSingle(),
    ])
    const kioskToken = tokenResult.data?.kiosk_token
    const kioskExpiresAt = tokenResult.data?.kiosk_token_expires_at
    badgeReady = isBadgeKioskReady({
      roomCount: roomsResult.error ? 0 : (roomsResult.count ?? 0),
      badgeCount: badgesResult.error ? 0 : (badgesResult.count ?? 0),
      kioskToken: tokenResult.error ? null : kioskToken,
      kioskExpiresAt: tokenResult.error ? null : kioskExpiresAt,
    })
  } catch {
    badgeReady = false
  }
  const badgeStep = steps.find((s) => s.id === 'badges')
  if (badgeStep) {
    badgeStep.done = badgeReady
    badgeStep.detail = badgeReady
      ? 'Room, student badge code, and live kiosk link ready'
      : 'Open Principal → Badges to finish rooms, badge codes, and kiosk access'
  }

  let craftReady = false
  try {
    const { probeCraftReadiness } = await import('@/lib/craft/go-live')
    const craft = await probeCraftReadiness(schoolId)
    craftReady = craft.ready
  } catch {
    craftReady = false
  }

  steps.push({
    id: 'craft',
    label: 'BeaconCraft digital twin',
    category: 'optional',
    done: craftReady,
    href: '/principal/release',
    detail: craftReady
      ? 'Twin rooms linked and smoke-tested'
      : 'Go-live → sync twin rooms and smoke-test /craft',
  })

  // silence unused
  void parents
  void assignments

  const { core, optional } = summarizeOnboardingSteps(steps)

  return { core, optional, steps }
}

export function summarizeOnboardingSteps(steps: OnboardingStep[]): {
  core: OnboardingSummary
  optional: OnboardingSummary
} {
  const summarize = (category: OnboardingStep['category']): OnboardingSummary => {
    const categorySteps = steps.filter((step) => step.category === category)
    const complete = categorySteps.filter((step) => step.done).length
    const total = categorySteps.length

    return {
      complete,
      total,
      percent: total === 0 ? 100 : Math.round((complete / total) * 100),
      steps: categorySteps,
    }
  }

  return {
    core: summarize('core'),
    optional: summarize('optional'),
  }
}

export function isBadgeKioskReady(input: {
  roomCount: number
  badgeCount: number
  kioskToken: unknown
  kioskExpiresAt: unknown
  now?: number
}): boolean {
  const { roomCount, badgeCount, kioskToken, kioskExpiresAt, now = Date.now() } = input

  return Boolean(
    roomCount > 0 &&
      badgeCount > 0 &&
      typeof kioskToken === 'string' &&
      kioskToken.length >= 16 &&
      typeof kioskExpiresAt === 'string' &&
      Date.parse(kioskExpiresAt) > now
  )
}

/**
 * Parent invitations require the complete ordered pilot path plus explicit
 * confirmation of every human trust check. Record counts alone are setup
 * progress and must never approve a parent-facing launch.
 */
export function isParentPilotReady(input: {
  pilotPathComplete: boolean
  checklist: Record<string, boolean>
}) {
  return (
    input.pilotPathComplete &&
    PARENT_PILOT_APPROVAL_CHECKS.every((id) => input.checklist[id] === true)
  )
}

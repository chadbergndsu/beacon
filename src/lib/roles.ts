import type { Profile, Role } from '@/lib/types'

/**
 * Optional principal email elevation via env (for a seed account).
 * Do not hardcode any one school’s principal.
 *
 *   BEACON_PRINCIPAL_EMAIL=principal@yourschool.org
 */
export function demoPrincipalEmail(): string | null {
  const v =
    process.env.BEACON_PRINCIPAL_EMAIL?.trim() ||
    process.env.BEACON_DEMO_PRINCIPAL_EMAIL?.trim()
  return v ? v.toLowerCase() : null
}

export function effectiveRole(
  profile: Pick<Profile, 'role' | 'email'> | null | undefined
): Role | null {
  if (!profile) return null
  const demo = demoPrincipalEmail()
  if (demo && profile.email?.toLowerCase() === demo) return 'principal'
  return profile.role
}

export function isLeadership(role: Role | null | undefined): boolean {
  return role === 'admin' || role === 'staff' || role === 'principal'
}

export function isSchoolStaff(role: Role | null | undefined): boolean {
  return isLeadership(role) || role === 'teacher'
}

export function canManageAllClasses(role: Role | null | undefined): boolean {
  return isLeadership(role)
}

export function canEnterGrades(
  role: Role | null | undefined,
  teacherId: string | null | undefined,
  userId: string
): boolean {
  if (isLeadership(role)) return true
  return role === 'teacher' && teacherId === userId
}

export function canPostAnnouncements(role: Role | null | undefined): boolean {
  return isSchoolStaff(role)
}

export function canAccessEmailOutbox(role: Role | null | undefined): boolean {
  return isSchoolStaff(role)
}

export function canSendSystemEmail(role: Role | null | undefined): boolean {
  return isLeadership(role)
}

export function roleLabel(role: Role | null | undefined): string {
  if (role === 'principal') return 'Principal'
  if (!role) return ''
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function homePathForRole(role: Role | null | undefined): string {
  if (role === 'principal') return '/principal'
  return '/dashboard'
}

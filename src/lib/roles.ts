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
  // Only elevate accounts that are already school staff — never promote parent/teacher
  // via env misconfiguration alone.
  if (
    demo &&
    profile.email?.toLowerCase() === demo &&
    (profile.role === 'admin' || profile.role === 'staff' || profile.role === 'principal')
  ) {
    return 'principal'
  }
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

/**
 * Grade entry permission.
 * Leadership may enter only when sameSchool is true (or school ids unavailable = deny).
 */
export function canEnterGrades(
  role: Role | null | undefined,
  teacherId: string | null | undefined,
  userId: string,
  opts?: {
    profileSchoolId?: string | null
    classSchoolId?: string | null
  }
): boolean {
  if (role === 'teacher') {
    if (teacherId !== userId) return false
    // Same school wall as canAccessClass (service-role path must not cross tenants)
    const ps = opts?.profileSchoolId
    const cs = opts?.classSchoolId
    if (!ps || !cs) return false
    return ps === cs
  }
  if (isLeadership(role)) {
    const ps = opts?.profileSchoolId
    const cs = opts?.classSchoolId
    if (!ps || !cs) return false
    return ps === cs
  }
  return false
}

/** Principal/admin only — not office staff (for deletes / approvals). */
export function isPrincipalOrAdmin(role: Role | null | undefined): boolean {
  return role === 'principal' || role === 'admin'
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

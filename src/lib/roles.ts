import type { Profile, Role } from '@/lib/types'

/** Demo principal account — always treated as principal in the app. */
export const PRINCIPAL_EMAIL = 'principal@lighthouse.test'

export function effectiveRole(profile: Pick<Profile, 'role' | 'email'> | null | undefined): Role | null {
  if (!profile) return null
  if (profile.email?.toLowerCase() === PRINCIPAL_EMAIL) return 'principal'
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

export function roleLabel(role: Role | null | undefined): string {
  if (role === 'principal') return 'Principal'
  if (!role) return ''
  return role.charAt(0).toUpperCase() + role.slice(1)
}

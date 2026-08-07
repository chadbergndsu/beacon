import type { Profile } from '@/lib/types'

export type OfficeShellMeta = {
  kicker: string
  title: string
  subtitle: string
  showLeadershipQuote: boolean
}

export function officeShellMeta(profile: Pick<Profile, 'full_name' | 'role'>): OfficeShellMeta {
  const first = profile.full_name?.trim().split(/\s+/)[0]
  const isAdmin = profile.role === 'admin'

  if (isAdmin) {
    return {
      kicker: 'School office',
      title: `${first || 'Office'} · Day-to-day operations`,
      subtitle:
        'Roster, billing, announcements, badges, and campus tools — the workspace for daily school updates.',
      showLeadershipQuote: false,
    }
  }

  return {
    kicker: 'Principal office',
    title: `${first || 'Principal'} · Operations`,
    subtitle: 'Tuition, climate, campus, and go-live — one calm workspace for your school.',
    showLeadershipQuote: true,
  }
}

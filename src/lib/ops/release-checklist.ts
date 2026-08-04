import { createAdminClient } from '@/lib/supabase/admin'

export type ChecklistItem = {
  id: string
  label: string
  help: string
  group: 'ops' | 'trust' | 'launch'
}

export const RELEASE_CHECKLIST: ChecklistItem[] = [
  {
    id: 'migrations',
    label: 'Database migrations 001–007 applied',
    help: 'Attendance, pulse, lessons, and videos tables exist (see health checks).',
    group: 'ops',
  },
  {
    id: 'principal_login',
    label: 'Principal can sign in',
    help: 'Profile role is principal (or admin) for your school.',
    group: 'ops',
  },
  {
    id: 'teacher_login',
    label: 'At least one teacher account works',
    help: 'Teacher can open a class and Quick Mode.',
    group: 'ops',
  },
  {
    id: 'parent_login',
    label: 'At least one parent linked to a student',
    help: 'Parent sees Dinner Table Digest and grades for their child only.',
    group: 'trust',
  },
  {
    id: 'phone_smoke',
    label: 'Phone smoke test passed',
    help: 'Login + dashboard + Quick Mode on a real phone (no sideways scroll).',
    group: 'trust',
  },
  {
    id: 'email_mode',
    label: 'Email delivery path ready',
    help: 'Resend and/or SMTP configured (cascade). Domain verified or school SMTP. Test from Comms.',
    group: 'trust',
  },
  {
    id: 'pilot_owner_alerts',
    label: 'Pilot owner alerts wired',
    help: 'BEACON_FEEDBACK_TO for email + optional BEACON_NTFY_URL for phone push. Suggestion button tested.',
    group: 'trust',
  },
  {
    id: 'qb_mode',
    label: 'QuickBooks mode labeled',
    help: 'Sandbox demo vs live OAuth is clear to the office — no surprise invoices.',
    group: 'trust',
  },
  {
    id: 'brand',
    label: 'School name & branding look correct',
    help: 'Update schools.name and settings.brand (short name, website, mission).',
    group: 'launch',
  },
  {
    id: 'ferpa_review',
    label: 'Access review done',
    help: 'Parents only linked to their students; no shared generic passwords.',
    group: 'trust',
  },
  {
    id: 'soft_launch',
    label: 'Soft launch approved',
    help: 'Leadership okays pilot with teachers/parents before wider rollout.',
    group: 'launch',
  },
]

export async function loadReleaseChecklistState(
  schoolId: string
): Promise<Record<string, boolean>> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()
  const settings = (data?.settings || {}) as { releaseChecklist?: Record<string, boolean> }
  return settings.releaseChecklist || {}
}

export async function saveReleaseChecklistState(
  schoolId: string,
  state: Record<string, boolean>
): Promise<void> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('schools')
    .select('settings')
    .eq('id', schoolId)
    .maybeSingle()
  const settings = { ...((data?.settings || {}) as object), releaseChecklist: state }
  const { error } = await admin.from('schools').update({ settings }).eq('id', schoolId)
  if (error) throw new Error(error.message)
}

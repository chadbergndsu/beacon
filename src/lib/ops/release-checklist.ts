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
    label: 'Database migrations 001–023 applied',
    help: 'Prefer: npm run db:migrate. Includes craft realtime (022), office admin seed (023), family portal, Stripe, money settle.',
    group: 'ops',
  },
  {
    id: 'security_016',
    label: 'Security RLS lockdown (016) run',
    help: 'Apply supabase/migrations/016_security_rls_lockdown.sql (or scripts/pending-016-security-rls-lockdown.sql) — locks profile role/school_id and parent write access.',
    group: 'ops',
  },
  {
    id: 'billing_017',
    label: 'Billing first-class tables (017) run',
    help: 'Apply 017_billing_first_class.sql — product code, invoice source_key, demo QB status, parent invoice RLS. Money is not in schools.settings.',
    group: 'ops',
  },
  {
    id: 'token_expiry_018',
    label: 'Access token expiry (018) run',
    help: 'Apply 018_access_token_expiry.sql — kiosk/device tokens expire (default 90 days). Resolve fails closed after expiry.',
    group: 'ops',
  },
  {
    id: 'upstash_prod',
    label: 'Upstash rate limits set for production',
    help: 'UPSTASH_REDIS_REST_URL + TOKEN on Vercel Production (or RATE_LIMIT_ALLOW_MEMORY=1 break-glass only).',
    group: 'ops',
  },
  {
    id: 'sentry',
    label: 'Sentry DSN set for production errors',
    help: 'SENTRY_DSN (server) + NEXT_PUBLIC_SENTRY_DSN (browser) on Vercel. Optional for pilot; recommended for public traffic.',
    group: 'ops',
  },
  {
    id: 'stripe',
    label: 'Stripe family pay configured (or N/A)',
    help: 'STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET on Vercel; webhook URL /api/stripe/webhook (checkout.session.completed). Apply migration 020. Test with sk_test_ first.',
    group: 'ops',
  },
  {
    id: 'kiosk_tokens',
    label: 'Kiosk tokens rotated after go-live',
    help: 'Principal → Badges: open kiosk once, then rotate if the link was ever shared outside the tablet. Re-open after expiry.',
    group: 'ops',
  },
  {
    id: 'craft_smoke',
    label: 'BeaconCraft twin smoke test',
    help: 'Go-live → sync twin rooms, open /craft, trigger a test scan, confirm marker appears in the correct room.',
    group: 'launch',
  },
  {
    id: 'slack',
    label: 'Slack office channel configured (or N/A)',
    help: 'BEACON_SLACK_WEBHOOK_URL on Vercel (Incoming Webhook), or bot token + channel. Test from Comms → Slack.',
    group: 'launch',
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
    id: 'qb_push',
    label: 'QuickBooks push verified (or N/A)',
    help: 'If using live QBO: Connect → create a test invoice → Push to QuickBooks → confirm in sandbox company. Demo mode is labeled and does not call Intuit.',
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
  const { mergeSchoolSettings } = await import('@/lib/school-settings')
  const r = await mergeSchoolSettings(schoolId, { releaseChecklist: state })
  if (!r.ok) throw new Error(r.error)
}

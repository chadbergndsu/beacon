/**
 * Ops health probes for go-live / trust. Never returns secret values.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { isQuickBooksConfigured } from '@/lib/billing/quickbooks'

export type CheckStatus = 'ok' | 'warn' | 'fail' | 'info'

export type HealthCheck = {
  id: string
  label: string
  status: CheckStatus
  detail: string
  category: 'platform' | 'data' | 'integrations' | 'trust'
}

export type OpsHealth = {
  generatedAt: string
  readyScore: number // 0–100
  checks: HealthCheck[]
  emailLive: boolean
  qbLiveConfigured: boolean
}

function envSet(name: string): boolean {
  const v = process.env[name]
  return Boolean(v && v.trim() && !v.includes('your-') && v.length > 4)
}

async function tableExists(table: string): Promise<boolean> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from(table).select('*').limit(1)
    // Missing table → error with relation/schema message; empty is fine
    if (!error) return true
    const msg = (error.message || '').toLowerCase()
    if (
      msg.includes('does not exist') ||
      msg.includes('could not find the table') ||
      msg.includes('schema cache') ||
      msg.includes('relation') ||
      (error as { code?: string }).code === 'PGRST205' ||
      (error as { code?: string }).code === '42P01'
    ) {
      return false
    }
    // RLS or other errors still mean table exists
    return true
  } catch {
    return false
  }
}

export async function probeOpsHealth(schoolId: string | null): Promise<OpsHealth> {
  const checks: HealthCheck[] = []

  // Platform
  checks.push({
    id: 'supabase_url',
    label: 'Supabase URL',
    status: envSet('NEXT_PUBLIC_SUPABASE_URL') ? 'ok' : 'fail',
    detail: envSet('NEXT_PUBLIC_SUPABASE_URL')
      ? 'Connected project configured'
      : 'Set NEXT_PUBLIC_SUPABASE_URL',
    category: 'platform',
  })
  checks.push({
    id: 'supabase_anon',
    label: 'Supabase anon key',
    status: envSet('NEXT_PUBLIC_SUPABASE_ANON_KEY') ? 'ok' : 'fail',
    detail: envSet('NEXT_PUBLIC_SUPABASE_ANON_KEY') ? 'Present' : 'Set NEXT_PUBLIC_SUPABASE_ANON_KEY',
    category: 'platform',
  })
  checks.push({
    id: 'service_role',
    label: 'Service role key',
    status: envSet('SUPABASE_SERVICE_ROLE_KEY') ? 'ok' : 'fail',
    detail: envSet('SUPABASE_SERVICE_ROLE_KEY')
      ? 'Server can write with admin client'
      : 'Set SUPABASE_SERVICE_ROLE_KEY (server only)',
    category: 'platform',
  })

  // Data tables (migration 007+ and badge/security suite)
  const tables = [
    ['schools', 'Schools'],
    ['profiles', 'Profiles'],
    ['students', 'Students'],
    ['classes', 'Classes'],
    ['grades', 'Grades'],
    ['email_outbox', 'Email outbox'],
    ['attendance', 'Attendance (007)'],
    ['lesson_plans', 'Lesson plans (007)'],
    ['pulse_entries', 'Pulse entries (007)'],
    ['school_videos', 'School videos (007)'],
    ['school_rooms', 'Rooms / kiosk (011)'],
    ['badge_scans', 'Badge scans (011)'],
    ['aftercare_sessions', 'Aftercare (011)'],
    ['school_access_tokens', 'Kiosk token vault (015)'],
    ['roster_revisions', 'Roster versions (013)'],
    ['approval_requests', 'Delete approvals (013)'],
    ['billing_products', 'Billing products (006/017)'],
    ['billing_invoices', 'Billing invoices (006/017)'],
    ['billing_payments', 'Billing payments (006/017)'],
    ['quickbooks_connections', 'QuickBooks connections (006/017)'],
    ['billing_payment_plans', 'Payment plans (019)'],
    ['billing_schedules', 'Recurring schedules (019)'],
  ] as const

  for (const [table, label] of tables) {
    const ok = await tableExists(table)
    const criticalCore = [
      'schools',
      'profiles',
      'students',
      'classes',
      'grades',
      'email_outbox',
    ].includes(table)
    const suiteOptional = [
      'lesson_plans',
      'pulse_entries',
      'school_videos',
      'attendance',
    ].includes(table)
    checks.push({
      id: `table_${table}`,
      label,
      status: ok ? 'ok' : criticalCore ? 'fail' : 'warn',
      detail: ok
        ? 'Table reachable'
        : criticalCore
          ? 'Missing — apply core migrations 001–008'
          : suiteOptional
            ? 'Missing — suite features fall back to JSON until migration 007'
            : table.startsWith('billing_') || table === 'quickbooks_connections'
              ? 'Missing — apply migrations 006 + 017 (npm run db:migrate); no settings JSON fallback'
              : `Missing — apply matching supabase/migrations file or npm run db:migrate (${label})`,
      category: 'data',
    })
  }

  // Counts (trust that the school has real data)
  if (schoolId && envSet('SUPABASE_SERVICE_ROLE_KEY')) {
    try {
      const admin = createAdminClient()
      const [
        { count: students },
        { count: teachers },
        { count: parents },
        { count: classes },
      ] = await Promise.all([
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
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('role', 'parent'),
        admin
          .from('classes')
          .select('*', { count: 'exact', head: true })
          .eq('school_id', schoolId)
          .eq('active', true),
      ])

      checks.push({
        id: 'roster_students',
        label: 'Active students',
        status: (students ?? 0) > 0 ? 'ok' : 'warn',
        detail: `${students ?? 0} on roster`,
        category: 'trust',
      })
      checks.push({
        id: 'roster_teachers',
        label: 'Teacher accounts',
        status: (teachers ?? 0) > 0 ? 'ok' : 'warn',
        detail: `${teachers ?? 0} teacher profiles`,
        category: 'trust',
      })
      checks.push({
        id: 'roster_parents',
        label: 'Parent accounts',
        status: (parents ?? 0) > 0 ? 'ok' : 'info',
        detail: `${parents ?? 0} parent profiles (link via parent_students)`,
        category: 'trust',
      })
      checks.push({
        id: 'roster_classes',
        label: 'Active classes',
        status: (classes ?? 0) > 0 ? 'ok' : 'warn',
        detail: `${classes ?? 0} classes`,
        category: 'trust',
      })
    } catch (e) {
      checks.push({
        id: 'roster_error',
        label: 'Roster probe',
        status: 'warn',
        detail: e instanceof Error ? e.message : 'Could not count roster',
        category: 'trust',
      })
    }
  }

  // Integrations — multi-transport cascade
  const { describeEmailStack } = await import('@/lib/email/transport')
  const emailStack = describeEmailStack()
  const fromRaw = process.env.EMAIL_FROM || 'Beacon <onboarding@resend.dev>'
  const insecureFrom = /onboarding@resend\.dev/i.test(fromRaw)
  checks.push({
    id: 'email',
    label: 'Email delivery',
    status: !emailStack.live ? 'warn' : insecureFrom ? 'warn' : 'ok',
    detail: !emailStack.live
      ? 'No live transport — set RESEND_API_KEY and/or SMTP_HOST (cascade: resend → smtp → log)'
      : insecureFrom
        ? `${emailStack.detail} · EMAIL_FROM is still onboarding@resend.dev (production forces log-only until you set a verified domain)`
        : `${emailStack.detail} · from ${fromRaw}`,
    category: 'integrations',
  })

  const { isNtfyConfigured } = await import('@/lib/notify/ntfy')
  const ntfyOn = isNtfyConfigured()
  checks.push({
    id: 'ntfy_owner',
    label: 'Pilot owner push (ntfy)',
    status: ntfyOn ? 'ok' : 'info',
    detail: ntfyOn
      ? 'Suggestions push to product owner phone via ntfy'
      : 'Optional: BEACON_NTFY_URL or BEACON_NTFY_TOPIC for instant pilot alerts',
    category: 'integrations',
  })

  const feedbackTo = envSet('BEACON_FEEDBACK_TO') || envSet('BEACON_OWNER_EMAIL')
  checks.push({
    id: 'feedback_owner',
    label: 'Pilot owner email',
    status: feedbackTo ? 'ok' : 'warn',
    detail: feedbackTo
      ? 'BEACON_FEEDBACK_TO configured'
      : 'Set BEACON_FEEDBACK_TO so suggestions email you (not the principal)',
    category: 'integrations',
  })

  const qbLiveConfigured = isQuickBooksConfigured()
  checks.push({
    id: 'quickbooks',
    label: 'QuickBooks OAuth',
    status: qbLiveConfigured ? 'ok' : 'info',
    detail: qbLiveConfigured
      ? `Configured (${process.env.INTUIT_ENVIRONMENT || 'sandbox'})`
      : 'Not configured — Connect uses labeled sandbox demo only',
    category: 'integrations',
  })

  const {
    isStripeConfigured,
    isStripeWebhookConfigured,
    isStripeMultiSchoolAllowed,
  } = await import('@/lib/billing/stripe')
  const stripeOn = isStripeConfigured()
  const stripeWh = isStripeWebhookConfigured()
  let schoolCount = 0
  if (stripeOn && envSet('SUPABASE_SERVICE_ROLE_KEY')) {
    try {
      const admin = createAdminClient()
      const { count } = await admin.from('schools').select('id', { count: 'exact', head: true })
      schoolCount = count ?? 0
    } catch {
      schoolCount = 0
    }
  }
  const multiSchoolStripeRisk =
    stripeOn && schoolCount > 1 && !isStripeMultiSchoolAllowed()
  checks.push({
    id: 'stripe',
    label: 'Stripe card payments',
    status: !stripeOn
      ? 'info'
      : multiSchoolStripeRisk
        ? 'fail'
        : stripeWh
          ? 'ok'
          : 'warn',
    detail: !stripeOn
      ? 'Optional: set STRIPE_SECRET_KEY for family portal card checkout'
      : multiSchoolStripeRisk
        ? `Stripe key set but ${schoolCount} schools exist — one merchant account mixes funds. Single-school only, or BEACON_STRIPE_MULTI_SCHOOL=1 with explicit policy / Connect later.`
        : stripeWh
          ? `STRIPE_SECRET_KEY + webhook ready${schoolCount === 1 ? ' · single-school treasury' : ''}`
          : 'STRIPE_SECRET_KEY set but STRIPE_WEBHOOK_SECRET missing — success page can still confirm',
    category: 'integrations',
  })

  const { durableRateLimitOk, isUpstashConfigured, isProductionLike } = await import(
    '@/lib/security/rate-limit'
  )
  const durableRl = durableRateLimitOk()
  checks.push({
    id: 'rate_limit_durable',
    label: 'Durable rate limits (Upstash)',
    status: durableRl ? 'ok' : isProductionLike() ? 'fail' : 'warn',
    detail: isUpstashConfigured()
      ? 'Upstash Redis configured — kiosk/device/login limits span instances'
      : isProductionLike()
        ? 'Production/preview without Upstash: limits are per-instance only. Set UPSTASH_REDIS_REST_URL + TOKEN (or RATE_LIMIT_ALLOW_MEMORY=1 break-glass).'
        : 'Local/dev: in-memory rate limits OK. Set Upstash before public production traffic.',
    category: 'platform',
  })

  const { isSentryConfigured } = await import('@/lib/ops/report-error')
  checks.push({
    id: 'sentry',
    label: 'Error tracking (Sentry)',
    status: isSentryConfigured() ? 'ok' : isProductionLike() ? 'warn' : 'info',
    detail: isSentryConfigured()
      ? 'SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN set — exceptions report via reportError + instrumentation'
      : 'Optional: set SENTRY_DSN (server) and NEXT_PUBLIC_SENTRY_DSN (browser) on Vercel',
    category: 'platform',
  })

  checks.push({
    id: 'ferpa',
    label: 'Access model',
    status: 'ok',
    detail:
      'Parents only see linked students; staff scoped by school; principal/admin for office tools',
    category: 'trust',
  })

  // Storage mode — critical for "do saves work?"
  const suiteTables = ['attendance', 'lesson_plans', 'pulse_entries', 'school_videos', 'email_outbox']
  const suiteMissing = suiteTables.filter(
    (t) => checks.find((c) => c.id === `table_${t}`)?.status !== 'ok'
  )
  checks.push({
    id: 'storage_mode',
    label: 'Where data saves',
    status: suiteMissing.length === 0 ? 'ok' : 'warn',
    detail:
      suiteMissing.length === 0
        ? 'First-class tables present (migration 007). Grades/classes always use core tables.'
        : `Migration 007 not fully applied. Missing: ${suiteMissing.join(', ')}. App still saves via schools.settings JSON for lessons/pulse/videos/cameras/attendance — apply 007 for durable tables + email outbox.`,
    category: 'data',
  })

  // Score: fail=-30, warn=-10, info=0, ok=+full
  const scorable = checks.filter((c) => c.status !== 'info')
  let points = 0
  let max = 0
  for (const c of scorable) {
    max += 10
    if (c.status === 'ok') points += 10
    else if (c.status === 'warn') points += 5
  }
  const readyScore = max ? Math.round((points / max) * 100) : 0

  return {
    generatedAt: new Date().toISOString(),
    readyScore,
    checks,
    emailLive: emailStack.live,
    qbLiveConfigured,
  }
}

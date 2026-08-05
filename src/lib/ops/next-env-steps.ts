/**
 * Go-live "next steps" + checklist suggestions with done state.
 * Pure helpers — unit tested.
 */

import type { OpsHealth } from '@/lib/ops/health'
import type { ChecklistItem } from '@/lib/ops/release-checklist'
import type { SchoolBrand } from '@/lib/school-brand'

export type LaunchSuggestion = {
  id: string
  label: string
  detail: string
  done: boolean
  /** Soft / skippable for pilot */
  optional?: boolean
  href?: string
  group: 'env' | 'checklist'
}

function checkStatus(health: OpsHealth, id: string): string | undefined {
  return health.checks.find((c) => c.id === id)?.status
}

/**
 * Server env steps + human checklist, with done flags for the Go-live panel.
 */
export function buildLaunchSuggestions(input: {
  health: OpsHealth
  checklist: Record<string, boolean>
  brand: SchoolBrand
  checklistItems: ChecklistItem[]
}): LaunchSuggestion[] {
  const { health, checklist, brand, checklistItems } = input

  const migrationsDone =
    Boolean(checklist.migrations) ||
    (checkStatus(health, 'table_billing_schedules') === 'ok' &&
      checkStatus(health, 'table_billing_invoices') === 'ok' &&
      checkStatus(health, 'table_school_access_tokens') === 'ok')

  const emailOk =
    Boolean(checklist.email_mode) ||
    (health.emailLive && checkStatus(health, 'email') === 'ok')

  const upstashOk =
    Boolean(checklist.upstash_prod) || checkStatus(health, 'rate_limit_durable') === 'ok'

  const sentryOk =
    Boolean(checklist.sentry) || checkStatus(health, 'sentry') === 'ok'

  const stripeStatus = checkStatus(health, 'stripe')
  const stripeOk =
    Boolean(checklist.stripe) ||
    stripeStatus === 'ok' ||
    stripeStatus === 'info' /* not configured = N/A for pilot */

  const qbOk = Boolean(checklist.qb_push) || health.qbLiveConfigured

  const envSteps: LaunchSuggestion[] = [
    {
      id: 'env_migrations',
      group: 'env',
      label: 'Database migrations applied',
      detail:
        'Migrations 001–021 on Supabase (family portal, token expiry, Stripe cols, money settle).',
      done: migrationsDone,
    },
    {
      id: 'env_email',
      group: 'env',
      label: 'Live email (Resend)',
      detail:
        'Verified domain + RESEND_API_KEY + EMAIL_FROM on Vercel. Test from Comms.',
      done: emailOk,
      href: '/admin/emails',
    },
    {
      id: 'env_office_email',
      group: 'env',
      label: 'School office email on branding',
      detail:
        'Office email on branding becomes Reply-To so parents can answer the office.',
      done: Boolean(brand.email?.trim()),
    },
    {
      id: 'env_upstash',
      group: 'env',
      label: 'Upstash rate limits (production)',
      detail: 'UPSTASH_REDIS_REST_URL + TOKEN on Vercel for kiosk/login across instances.',
      done: upstashOk,
    },
    {
      id: 'env_sentry',
      group: 'env',
      label: 'Sentry error tracking',
      detail: 'SENTRY_DSN + NEXT_PUBLIC_SENTRY_DSN on Vercel (recommended for public traffic).',
      done: sentryOk,
      optional: true,
    },
    {
      id: 'env_stripe',
      group: 'env',
      label: 'Stripe family pay (or N/A)',
      detail: 'STRIPE_SECRET_KEY + webhook secret if card pay is on; skip if not using Stripe yet.',
      done: stripeOk,
      optional: true,
      href: '/principal/billing',
    },
    {
      id: 'env_quickbooks',
      group: 'env',
      label: 'Live QuickBooks OAuth (or N/A)',
      detail: 'INTUIT_CLIENT_ID / SECRET / redirect URI when pushing invoices live.',
      done: qbOk,
      optional: true,
      href: '/principal/payments',
    },
    {
      id: 'env_principal_seed',
      group: 'env',
      label: 'Optional principal seed elevation',
      detail: 'BEACON_PRINCIPAL_EMAIL=you@yourschool.org on Vercel if you use env-pinned principal.',
      done: Boolean(checklist.principal_login),
      optional: true,
    },
  ]

  const checklistSteps: LaunchSuggestion[] = checklistItems.map((item) => ({
    id: `check_${item.id}`,
    group: 'checklist' as const,
    label: item.label,
    detail: item.help,
    done: Boolean(checklist[item.id]),
    optional: item.group === 'launch' || item.id.startsWith('qb_') || item.id === 'stripe',
  }))

  return [...envSteps, ...checklistSteps]
}

export function partitionSuggestions(items: LaunchSuggestion[]): {
  open: LaunchSuggestion[]
  done: LaunchSuggestion[]
} {
  const open = items.filter((i) => !i.done)
  const done = items.filter((i) => i.done)
  // Required open first, then optional open
  open.sort((a, b) => Number(Boolean(a.optional)) - Number(Boolean(b.optional)))
  return { open, done }
}

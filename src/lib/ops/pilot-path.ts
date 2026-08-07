/**
 * Ordered soft-pilot path — matches docs/pilot-go-live.md.
 * Pure helpers for Go-live UI + unit tests.
 */

export type PilotPathStep = {
  id: string
  title: string
  detail: string
  href?: string
  /** Maps to release checklist id when human-tickable */
  checklistId?: string
  /** Maps to ops health check id */
  healthId?: string
}

export const PILOT_PATH_STEPS: readonly PilotPathStep[] = [
  {
    id: 'migrations',
    title: '1. All database migrations',
    detail:
      'Run npm run db:migrate against production Supabase and confirm every repository migration, including timestamped authorization hardening.',
    checklistId: 'migrations',
  },
  {
    id: 'env',
    title: '2. Production env',
    detail:
      'Supabase trio + Upstash (or RATE_LIMIT_ALLOW_MEMORY=1) + EMAIL_FROM on verified domain + NEXT_PUBLIC_APP_URL.',
    healthId: 'supabase_url',
  },
  {
    id: 'accounts',
    title: '3. Chris, Marian, teacher',
    detail:
      'Auth users with school_id: principal (Chris), admin (Marian), ≥1 teacher with a class. See scripts/seed-pilot-accounts.sql.',
    checklistId: 'principal_login',
  },
  {
    id: 'email',
    title: '4. Comms email test',
    detail: 'Comms → Send live test — message must land in a real inbox (not log-only).',
    href: '/admin/emails',
    checklistId: 'email_mode',
    healthId: 'email',
  },
  {
    id: 'golive',
    title: '5. Go-live health reviewed',
    detail:
      'Brand the school and clear every blocking health failure. Approved controlled-pilot warnings may remain visible.',
    href: '/principal/release',
    checklistId: 'brand',
  },
  {
    id: 'parents',
    title: '6. Parent links',
    detail: 'Link ≥1 parent to a student before inviting families.',
    href: '/principal/roster',
    checklistId: 'parent_login',
  },
  {
    id: 'soft_launch',
    title: '7. Soft launch',
    detail: 'Leadership okays teachers/parents before wider rollout.',
    checklistId: 'soft_launch',
  },
] as const

export type PilotPathStatus = {
  step: PilotPathStep
  done: boolean
}

export function resolvePilotPath(input: {
  checklist: Record<string, boolean>
  healthById: Record<string, string | undefined>
  emailLive: boolean
  hasPrincipalOrAdmin: boolean
  hasTeacher: boolean
  hasParentLinks: boolean
  brandOk: boolean
  hasBlockingHealthFailure: boolean
}): PilotPathStatus[] {
  return PILOT_PATH_STEPS.map((step) => {
    let done = false
    if (step.id === 'migrations') {
      done = Boolean(input.checklist.migrations)
    } else if (step.id === 'env') {
      const url = input.healthById.supabase_url
      const anon = input.healthById.supabase_anon
      const svc = input.healthById.service_role
      const rate = input.healthById.rate_limit_durable
      done =
        url === 'ok' &&
        anon === 'ok' &&
        svc === 'ok' &&
        (rate === 'ok' || rate === 'info' || rate === 'warn')
    } else if (step.id === 'accounts') {
      done =
        (Boolean(input.checklist.principal_login) || input.hasPrincipalOrAdmin) &&
        (Boolean(input.checklist.teacher_login) || input.hasTeacher)
    } else if (step.id === 'email') {
      done = Boolean(input.checklist.email_mode) || input.emailLive
    } else if (step.id === 'golive') {
      done =
        (Boolean(input.checklist.brand) || input.brandOk) &&
        !input.hasBlockingHealthFailure
    } else if (step.id === 'parents') {
      done = Boolean(input.checklist.parent_login) || input.hasParentLinks
    } else if (step.id === 'soft_launch') {
      done = Boolean(input.checklist.soft_launch)
    }
    return { step, done }
  })
}

export function nextOpenPilotStep(statuses: PilotPathStatus[]): PilotPathStatus | null {
  return statuses.find((s) => !s.done) ?? null
}

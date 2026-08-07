import { describe, expect, it } from 'vitest'
import { nextOpenPilotStep, resolvePilotPath } from './pilot-path'

describe('resolvePilotPath', () => {
  it('marks steps done from checklist and health', () => {
    const statuses = resolvePilotPath({
      checklist: {
        migrations: true,
        principal_login: true,
        teacher_login: true,
        email_mode: true,
        brand: true,
        parent_login: false,
        soft_launch: false,
      },
      healthById: {
        supabase_url: 'ok',
        supabase_anon: 'ok',
        service_role: 'ok',
        rate_limit_durable: 'ok',
        email: 'ok',
      },
      emailLive: true,
      hasPrincipalOrAdmin: true,
      hasTeacher: true,
      hasParentLinks: false,
      brandOk: true,
      hasBlockingHealthFailure: false,
    })
    expect(statuses.find((s) => s.step.id === 'migrations')?.done).toBe(true)
    expect(statuses.find((s) => s.step.id === 'email')?.done).toBe(true)
    expect(statuses.find((s) => s.step.id === 'parents')?.done).toBe(false)
    expect(nextOpenPilotStep(statuses)?.step.id).toBe('parents')
  })

  it('returns null when all done', () => {
    const statuses = resolvePilotPath({
      checklist: {
        migrations: true,
        principal_login: true,
        teacher_login: true,
        email_mode: true,
        brand: true,
        parent_login: true,
        soft_launch: true,
      },
      healthById: {
        supabase_url: 'ok',
        supabase_anon: 'ok',
        service_role: 'ok',
        rate_limit_durable: 'ok',
      },
      emailLive: true,
      hasPrincipalOrAdmin: true,
      hasTeacher: true,
      hasParentLinks: true,
      brandOk: true,
      hasBlockingHealthFailure: false,
    })
    expect(nextOpenPilotStep(statuses)).toBeNull()
  })

  it('does not approve the go-live step while a blocking health failure remains', () => {
    const statuses = resolvePilotPath({
      checklist: { brand: true },
      healthById: {},
      emailLive: false,
      hasPrincipalOrAdmin: true,
      hasTeacher: true,
      hasParentLinks: true,
      brandOk: true,
      hasBlockingHealthFailure: true,
    })

    expect(statuses.find((status) => status.step.id === 'golive')?.done).toBe(false)
  })
})

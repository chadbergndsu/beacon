import { describe, expect, it, vi, beforeEach } from 'vitest'

const state = vi.hoisted(() => ({
  settings: { billing: { invoices: [] as unknown[] }, modules: { cameras: [] as unknown[] } } as Record<
    string,
    unknown
  >,
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { settings: { ...state.settings } }, error: null }),
        }),
      }),
      update: (payload: { settings: Record<string, unknown> }) => ({
        eq: async () => {
          state.settings = payload.settings
          return { error: null }
        },
      }),
    }),
  }),
}))

import { mergeSchoolSettings, mergeSchoolSettingsNested } from './school-settings'

describe('mergeSchoolSettings', () => {
  beforeEach(() => {
    state.settings = { billing: { invoices: [1] }, modules: { cameras: ['cam'] } }
  })

  it('merges one key without dropping others', async () => {
    const r = await mergeSchoolSettings('s1', { releaseChecklist: { a: true } })
    expect(r.ok).toBe(true)
    expect(state.settings.billing).toEqual({ invoices: [1] })
    expect(state.settings.modules).toEqual({ cameras: ['cam'] })
    expect(state.settings.releaseChecklist).toEqual({ a: true })
  })

  it('nested badge merge keeps sibling keys', async () => {
    state.settings = { badge: { notifyParentsOnAftercare: true, other: 1 }, billing: {} }
    const r = await mergeSchoolSettingsNested('s1', 'badge', { notifyParentsOnAftercare: false })
    expect(r.ok).toBe(true)
    const badge = state.settings.badge as Record<string, unknown>
    expect(badge.notifyParentsOnAftercare).toBe(false)
    expect(badge.other).toBe(1)
  })
})

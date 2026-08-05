import { describe, expect, it } from 'vitest'
import {
  buildLaunchSuggestions,
  partitionSuggestions,
  type LaunchSuggestion,
} from './next-env-steps'
import { RELEASE_CHECKLIST } from './release-checklist'
import type { OpsHealth } from './health'
import { DEFAULT_BRAND } from '@/lib/school-brand'

function health(partial: Partial<OpsHealth> & { checks?: OpsHealth['checks'] }): OpsHealth {
  return {
    generatedAt: new Date().toISOString(),
    readyScore: 50,
    emailLive: false,
    qbLiveConfigured: false,
    checks: [],
    ...partial,
  }
}

const brand = { ...DEFAULT_BRAND, name: 'Test School', shortName: 'TS' }

describe('buildLaunchSuggestions', () => {
  it('marks migrations and email done from checklist', () => {
    const items = buildLaunchSuggestions({
      health: health({
        emailLive: true,
        checks: [
          { id: 'email', label: 'Email', status: 'ok', detail: 'ok', category: 'integrations' },
        ],
      }),
      checklist: { migrations: true, email_mode: true },
      brand: { ...brand, email: 'office@school.org' },
      checklistItems: RELEASE_CHECKLIST,
    })
    expect(items.find((i) => i.id === 'env_migrations')?.done).toBe(true)
    expect(items.find((i) => i.id === 'env_email')?.done).toBe(true)
    expect(items.find((i) => i.id === 'env_office_email')?.done).toBe(true)
  })

  it('partitions open before done', () => {
    const sample: LaunchSuggestion[] = [
      {
        id: 'a',
        label: 'A',
        detail: '',
        done: true,
        group: 'env',
      },
      {
        id: 'b',
        label: 'B',
        detail: '',
        done: false,
        group: 'env',
      },
    ]
    const { open, done } = partitionSuggestions(sample)
    expect(open.map((i) => i.id)).toEqual(['b'])
    expect(done.map((i) => i.id)).toEqual(['a'])
  })
})

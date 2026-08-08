import { describe, expect, it } from 'vitest'
import {
  normalizePeopleQuery,
  normalizePeopleRefs,
  peopleRefKey,
  PEOPLE_RECENT_LIMIT,
  PEOPLE_SELECTION_LIMIT,
} from './people-types'

describe('people messaging contracts', () => {
  it('normalizes whitespace without accepting one-character search', () => {
    expect(normalizePeopleQuery('  Ava   Reed ')).toBe('Ava Reed')
    expect(normalizePeopleQuery(' A ')).toBe('')
  })

  it('deduplicates opaque references and rejects malformed or oversized input', () => {
    const profile = { kind: 'profile' as const, id: '11111111-1111-4111-8111-111111111111' }
    expect(normalizePeopleRefs([profile, profile])).toEqual([profile])
    expect(peopleRefKey(profile)).toBe('profile:11111111-1111-4111-8111-111111111111')
    expect(normalizePeopleRefs([{ kind: 'profile', id: 'not-a-uuid' }])).toEqual([])
    expect(
      normalizePeopleRefs(
        Array.from({ length: PEOPLE_SELECTION_LIMIT + 1 }, (_, index) => ({
          kind: 'student',
          id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
        }))
      )
    ).toHaveLength(0)
    expect(PEOPLE_RECENT_LIMIT).toBe(8)
  })
})

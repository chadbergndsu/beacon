import { afterEach, describe, expect, it } from 'vitest'
import { signOAuthState, verifyOAuthState } from './oauth-state'

describe('oauth-state', () => {
  afterEach(() => {
    delete process.env.BEACON_OAUTH_STATE_SECRET
  })

  it('round-trips signed state', () => {
    process.env.BEACON_OAUTH_STATE_SECRET = 'test-secret'
    const state = signOAuthState({ schoolId: 's1', userId: 'u1' })
    const v = verifyOAuthState(state)
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.payload.schoolId).toBe('s1')
      expect(v.payload.userId).toBe('u1')
    }
  })

  it('rejects tampered state', () => {
    process.env.BEACON_OAUTH_STATE_SECRET = 'test-secret'
    const state = signOAuthState({ schoolId: 's1', userId: 'u1' })
    const bad = state.slice(0, -4) + 'xxxx'
    expect(verifyOAuthState(bad).ok).toBe(false)
  })

  it('rejects bare base64 without signature', () => {
    const bare = Buffer.from(JSON.stringify({ schoolId: 's1', userId: 'u1', ts: Date.now() })).toString(
      'base64url'
    )
    expect(verifyOAuthState(bare).ok).toBe(false)
  })
})

import { afterEach, describe, expect, it } from 'vitest'
import { isNtfyConfigured, resolveNtfyEndpoint } from './ntfy'

describe('resolveNtfyEndpoint', () => {
  afterEach(() => {
    delete process.env.BEACON_NTFY_URL
    delete process.env.BEACON_NTFY_SERVER
    delete process.env.BEACON_NTFY_TOPIC
    delete process.env.BEACON_NTFY_TOKEN
  })

  it('uses full BEACON_NTFY_URL', () => {
    process.env.BEACON_NTFY_URL = 'https://ntfy.sh/beacon-pilot-secret'
    const ep = resolveNtfyEndpoint()
    expect(ep?.url).toBe('https://ntfy.sh/beacon-pilot-secret')
    expect(isNtfyConfigured()).toBe(true)
  })

  it('builds from server + topic', () => {
    process.env.BEACON_NTFY_TOPIC = 'beacon_pilot_xyz'
    const ep = resolveNtfyEndpoint()
    expect(ep?.url).toBe('https://ntfy.sh/beacon_pilot_xyz')
  })

  it('rejects weak topics', () => {
    process.env.BEACON_NTFY_TOPIC = 'ab'
    expect(resolveNtfyEndpoint()).toBeNull()
  })

  it('unset → not configured', () => {
    expect(isNtfyConfigured()).toBe(false)
  })
})

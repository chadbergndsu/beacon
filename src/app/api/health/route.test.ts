import { afterEach, describe, expect, it } from 'vitest'
import { GET } from './route'
import { NextRequest } from 'next/server'

function req(path = 'http://localhost/api/health', headers?: Record<string, string>) {
  return new NextRequest(path, { headers })
}

describe('GET /api/health', () => {
  afterEach(() => {
    delete process.env.BEACON_HEALTH_SECRET
  })

  it('returns bare ok without secret', async () => {
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
    expect(body.generatedAt).toBeTruthy()
    expect(body.checks).toBeUndefined()
  })

  it('returns bare ok when secret misconfigured/mismatched (query secret ignored)', async () => {
    process.env.BEACON_HEALTH_SECRET = 'correct'
    const res = await GET(req('http://localhost/api/health?secret=correct'))
    expect(res.status).toBe(200)
    const body = await res.json()
    // Query param must not unlock detailed checks
    expect(body.checks).toBeUndefined()
  })

  it('returns detailed checks with matching secret header', async () => {
    process.env.BEACON_HEALTH_SECRET = 's3cret'
    // No service role in unit test → degraded path is fine
    delete process.env.SUPABASE_SERVICE_ROLE_KEY
    const res = await GET(
      req('http://localhost/api/health', { 'x-beacon-health-secret': 's3cret' })
    )
    const body = await res.json()
    expect(body.checks).toBeTruthy()
    expect(body.checks.supabaseEnv).toBeDefined()
    expect(body.checks.emailLive).toBeDefined()
  })
})

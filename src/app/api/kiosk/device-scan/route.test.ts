import { describe, expect, it, vi, beforeEach } from 'vitest'

const processDeviceScan = vi.hoisted(() => vi.fn())

vi.mock('@/lib/badge/store', () => ({
  processDeviceScan: (...args: unknown[]) => processDeviceScan(...args),
}))

import { GET, POST } from './route'

describe('/api/kiosk/device-scan', () => {
  beforeEach(() => {
    processDeviceScan.mockReset()
  })

  it('GET is method-not-allowed', async () => {
    const res = await GET()
    expect(res.status).toBe(405)
  })

  it('POST rejects invalid JSON', async () => {
    const res = await POST(
      new Request('http://localhost/api/kiosk/device-scan', {
        method: 'POST',
        body: 'not-json',
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
  })

  it('POST rejects missing fields', async () => {
    const res = await POST(
      new Request('http://localhost/api/kiosk/device-scan', {
        method: 'POST',
        body: JSON.stringify({ deviceToken: 'x' }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(400)
  })

  const roomId = '11111111-1111-4111-8111-111111111111'

  it('POST maps invalid device token to 401 Unauthorized', async () => {
    processDeviceScan.mockResolvedValue({
      ok: false,
      error: 'Invalid device token.',
    })
    const res = await POST(
      new Request('http://localhost/api/kiosk/device-scan', {
        method: 'POST',
        body: JSON.stringify({
          deviceToken: 'dev_ABCDEFGH12345678',
          code: 'ABCD12',
          roomId,
        }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('POST returns success payload', async () => {
    processDeviceScan.mockResolvedValue({
      ok: true,
      message: 'IN: Ann Bee',
      studentName: 'Ann Bee',
    })
    const res = await POST(
      new Request('http://localhost/api/kiosk/device-scan', {
        method: 'POST',
        body: JSON.stringify({
          deviceToken: 'dev_ABCDEFGH12345678',
          code: 'ABCD12',
          roomId,
          direction: 'in',
        }),
        headers: { 'content-type': 'application/json' },
      })
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.ok).toBe(true)
    expect(processDeviceScan).toHaveBeenCalled()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  createAdminClient: vi.fn(),
  resolveFeedbackOwnerEmail: vi.fn(),
  isEmailHonestLive: vi.fn(),
}))

vi.mock('server-only', () => ({}))
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/pilot-feedback/owner', () => ({
  resolveFeedbackOwnerEmail: mocks.resolveFeedbackOwnerEmail,
}))
vi.mock('@/lib/email/transport', () => ({ isEmailHonestLive: mocks.isEmailHonestLive }))

import {
  isDesignPartnerInquiryReady,
  publicInquiryLimiterReady,
  resetInquiryReadinessCacheForTests,
} from './inquiry-readiness'

describe('design-partner inquiry readiness', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createAdminClient.mockReturnValue({ rpc: mocks.rpc })
    mocks.resolveFeedbackOwnerEmail.mockReturnValue('owner@example.com')
    mocks.isEmailHonestLive.mockReturnValue(true)
    mocks.rpc.mockResolvedValue({ data: true, error: null })
    resetInquiryReadinessCacheForTests()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('is ready only when the database limiter probe succeeds', async () => {
    await expect(isDesignPartnerInquiryReady()).resolves.toBe(true)
    expect(mocks.rpc).toHaveBeenCalledWith('public_inquiry_rate_limit_ready')
  })

  it('fails closed when the limiter migration is missing', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'PGRST202', message: 'function not found in schema cache' },
    })
    await expect(publicInquiryLimiterReady()).resolves.toBe(false)
  })

  it('fails closed when service-role configuration is missing', async () => {
    mocks.createAdminClient.mockImplementation(() => {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
    })
    await expect(publicInquiryLimiterReady()).resolves.toBe(false)
  })

  it('does not probe the database without a real owner and live transport', async () => {
    mocks.resolveFeedbackOwnerEmail.mockReturnValue(null)
    await expect(isDesignPartnerInquiryReady()).resolves.toBe(false)
    expect(mocks.rpc).not.toHaveBeenCalled()
  })

  it('caches a successful probe for subsequent public page renders', async () => {
    await expect(publicInquiryLimiterReady()).resolves.toBe(true)
    await expect(publicInquiryLimiterReady()).resolves.toBe(true)
    expect(mocks.rpc).toHaveBeenCalledTimes(1)
  })

  it('fails closed when the database probe exceeds its latency bound', async () => {
    vi.useFakeTimers()
    mocks.rpc.mockReturnValue(new Promise(() => {}))
    const readiness = publicInquiryLimiterReady()
    await vi.advanceTimersByTimeAsync(1_500)
    await expect(readiness).resolves.toBe(false)
  })
})

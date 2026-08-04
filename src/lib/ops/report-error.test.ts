import { afterEach, describe, expect, it, vi } from 'vitest'
import { isSentryConfigured, reportError } from './report-error'

describe('reportError', () => {
  afterEach(() => {
    delete process.env.SENTRY_DSN
    delete process.env.NEXT_PUBLIC_SENTRY_DSN
    vi.restoreAllMocks()
  })

  it('isSentryConfigured reflects DSN', () => {
    expect(isSentryConfigured()).toBe(false)
    process.env.SENTRY_DSN = 'https://x@o.ingest.sentry.io/1'
    expect(isSentryConfigured()).toBe(true)
  })

  it('always logs without throwing when DSN unset', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => reportError(new Error('boom'), { a: 1 })).not.toThrow()
    expect(spy).toHaveBeenCalled()
  })
})

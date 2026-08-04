/**
 * Central error reporting. Always logs. Captures to Sentry when DSN is set
 * and @sentry/nextjs is initialized (see instrumentation.ts).
 */

export function isSentryConfigured(): boolean {
  return Boolean(
    process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  )
}

export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error))
  console.error('[beacon]', err.message, context ?? '')

  if (!isSentryConfigured()) return

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs') as {
      captureException?: (
        e: Error,
        hint?: { extra?: Record<string, unknown>; tags?: Record<string, string> }
      ) => void
    }
    Sentry.captureException?.(err, {
      extra: context,
      tags: { surface: 'reportError' },
    })
  } catch {
    // Package missing or not initialized — console only
  }
}

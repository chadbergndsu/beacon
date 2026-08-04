/**
 * Optional error reporting. When SENTRY_DSN is set and @sentry/nextjs is available,
 * captures exceptions. Always logs to console as fallback.
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const err = error instanceof Error ? error : new Error(String(error))
  console.error('[beacon]', err.message, context ?? '')

  const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  if (!dsn) return

  // Dynamic require so builds work without Sentry installed
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require('@sentry/nextjs') as {
      captureException?: (e: Error, hint?: { extra?: Record<string, unknown> }) => void
    }
    Sentry.captureException?.(err, context ? { extra: context } : undefined)
  } catch {
    // Sentry package not installed — console only
  }
}

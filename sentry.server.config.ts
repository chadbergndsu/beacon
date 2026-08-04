/**
 * Server-side Sentry. Loaded from instrumentation.ts when DSN is set.
 * No-op when SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN is empty (CI / local).
 */
import * as Sentry from '@sentry/nextjs'

const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()

Sentry.init({
  dsn: dsn || undefined,
  enabled: Boolean(dsn),
  environment:
    process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.08 : 0,
  // Avoid PII in default breadcrumbs; app should not put secrets in extras
  sendDefaultPii: false,
})

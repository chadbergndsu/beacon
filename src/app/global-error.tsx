'use client'

import { useEffect } from 'react'

/**
 * Root error boundary — reports to Sentry when NEXT_PUBLIC_SENTRY_DSN is set.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Dynamic import keeps first paint light when Sentry is unused
    void import('@/lib/ops/report-error').then(({ reportError }) => {
      reportError(error, { digest: error.digest, surface: 'global-error' })
    })
  }, [error])

  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <h1 style={{ fontSize: 20, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: '#475569', marginBottom: 16 }}>
          Beacon hit an unexpected error. Try again, or sign out and back in.
        </p>
        {error.digest && (
          <p style={{ fontSize: 12, color: '#94a3b8' }}>Ref: {error.digest}</p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: 12,
            padding: '8px 14px',
            borderRadius: 8,
            border: '1px solid #cbd5e1',
            background: '#0f172a',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}

import Link from 'next/link'
import type { Role } from '@/lib/types'

/**
 * Honest ops banners so leadership never confuses demo modes with production.
 * Teachers also see log-only email (they send class announcements).
 */
export function TrustModeBanner({
  emailLive,
  qbLiveConfigured,
  role,
}: {
  emailLive: boolean
  qbLiveConfigured: boolean
  role?: Role | null
}) {
  const leadership = role === 'principal' || role === 'admin' || role === 'staff'
  const teacher = role === 'teacher'
  if (!leadership && !teacher) return null

  // Teachers only care about email transport honesty
  if (teacher) {
    if (emailLive) return null
    return (
      <div className="border-b border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="mx-auto max-w-7xl px-3 py-2.5 text-xs sm:px-6 sm:text-sm font-medium">
          Email is <strong>log-only</strong> (no live transport) — parent notices may not leave the
          building. Check Email outbox / ask principal to configure Resend or SMTP.
        </div>
      </div>
    )
  }

  if (emailLive && qbLiveConfigured) return null

  return (
    <div className="border-b border-amber-200/80 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 px-3 py-2.5 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-sm">
        <p className="font-medium leading-snug">
          {!emailLive && !qbLiveConfigured && (
            <>
              Trust modes: email is <strong>log-only</strong> · QuickBooks is{' '}
              <strong>demo until OAuth keys</strong>.
            </>
          )}
          {!emailLive && qbLiveConfigured && (
            <>
              Email is <strong>log-only</strong> until a live transport is configured — outbox still
              records every message.
            </>
          )}
          {emailLive && !qbLiveConfigured && (
            <>
              QuickBooks OAuth not configured — Connect uses a <strong>labeled sandbox demo</strong>{' '}
              only.
            </>
          )}
        </p>
        <Link
          href="/principal/release"
          className="shrink-0 font-semibold text-amber-900 underline-offset-2 hover:underline dark:text-amber-200"
        >
          Go-live checklist →
        </Link>
      </div>
    </div>
  )
}

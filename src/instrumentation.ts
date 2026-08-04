/**
 * Next.js instrumentation — initializes Sentry on server/edge when DSN is set.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('../sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('../sentry.edge.config')
  }
}

export async function onRequestError(
  err: unknown,
  request: {
    path: string
    method: string
    headers: { get(name: string): string | null }
  },
  context: { routerKind: string; routePath: string; routeType: string }
) {
  const dsn = process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()
  if (!dsn) return
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureException(err, {
      extra: {
        path: request.path,
        method: request.method,
        routerKind: context.routerKind,
        routePath: context.routePath,
        routeType: context.routeType,
      },
    })
  } catch {
    console.error('[beacon] onRequestError', err)
  }
}

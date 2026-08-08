const DEFAULT_SLOW_OPERATION_MS = 750

function slowOperationThreshold(): number {
  const configured = Number(process.env.BEACON_SLOW_OPERATION_MS)
  return Number.isFinite(configured) && configured >= 0
    ? configured
    : DEFAULT_SLOW_OPERATION_MS
}

/**
 * Record coarse server-operation timings without identifiers or payload data.
 * Slow operations are always visible in platform logs; BEACON_PERF_LOG=1 logs all.
 */
export async function measureServerOperation<T>(
  operation: string,
  run: () => Promise<T>
): Promise<T> {
  const startedAt = performance.now()
  let status: 'ok' | 'error' = 'ok'

  try {
    return await run()
  } catch (error) {
    status = 'error'
    throw error
  } finally {
    const durationMs = Math.max(0, Math.round(performance.now() - startedAt))
    if (
      process.env.BEACON_PERF_LOG === '1' ||
      durationMs >= slowOperationThreshold()
    ) {
      console.info(
        '[beacon:perf]',
        JSON.stringify({ operation, durationMs, status })
      )
    }
  }
}

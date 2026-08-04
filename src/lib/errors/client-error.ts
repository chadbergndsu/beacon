/**
 * Map internal/driver errors to safe client messages.
 * Always log the full error server-side before returning.
 */
export function toClientError(err: unknown, fallback = 'Could not save. Try again.'): string {
  const msg = err instanceof Error ? err.message : typeof err === 'string' ? err : ''
  if (!msg) return fallback

  const lower = msg.toLowerCase()
  if (lower.includes('duplicate') || lower.includes('unique')) {
    return 'That record already exists.'
  }
  if (lower.includes('foreign key') || lower.includes('violates foreign')) {
    return 'Related record missing or invalid.'
  }
  if (lower.includes('check constraint') || lower.includes('violates check')) {
    return 'Invalid value for this field.'
  }
  if (lower.includes('not signed in') || lower.includes('jwt')) {
    return 'Please sign in again.'
  }
  if (lower.includes('permission') || lower.includes('not allowed')) {
    return msg
  }
  // Known human messages from our actions
  if (
    msg.length < 120 &&
    !lower.includes('postgres') &&
    !lower.includes('pgrst') &&
    !lower.includes('column') &&
    !lower.includes('relation') &&
    !lower.includes('schema')
  ) {
    return msg
  }
  console.error('[beacon] client-safe error:', msg)
  return fallback
}

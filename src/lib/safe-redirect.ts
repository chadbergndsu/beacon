/**
 * Prevent open redirects: only allow same-origin relative paths.
 */
export function safeInternalPath(path: string | null | undefined, fallback = '/dashboard'): string {
  if (!path) return fallback
  const trimmed = path.trim()
  if (!trimmed.startsWith('/')) return fallback
  if (trimmed.startsWith('//')) return fallback
  if (trimmed.includes('\\')) return fallback
  if (trimmed.includes('://')) return fallback
  // Block protocol-relative and encoded tricks
  try {
    const decoded = decodeURIComponent(trimmed)
    if (decoded.startsWith('//') || decoded.includes('://')) return fallback
  } catch {
    return fallback
  }
  return trimmed
}

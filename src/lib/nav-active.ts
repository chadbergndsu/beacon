/**
 * Pick which nav item should show as active for the current path.
 * Longest matching href wins so /principal/release lights Go-live, not Overview.
 */
export function resolveActiveNavHref(
  pathname: string,
  hrefs: string[]
): string | null {
  const path = pathname || '/'
  let best: string | null = null

  for (const href of hrefs) {
    if (!href) continue
    const match =
      href === '/dashboard'
        ? path === '/dashboard' || path === '/'
        : path === href || path.startsWith(href + '/')
    if (!match) continue
    if (!best || href.length > best.length) best = href
  }

  return best
}

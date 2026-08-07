/**
 * Pick which nav item should show as active for the current path.
 * Longest matching href wins so /principal/release lights Go-live, not Overview.
 * Special-case: /principal alone should not steal active from /principal/*.
 * Family Desk: /desk redirects to /admin/emails — keep Desk lit on either path.
 */
export function resolveActiveNavHref(
  pathname: string,
  hrefs: string[]
): string | null {
  const path = pathname || '/'
  let best: string | null = null

  for (const href of hrefs) {
    if (!href) continue
    let match = false
    if (href === '/dashboard') {
      match = path === '/dashboard' || path === '/'
    } else if (href === '/principal') {
      // Exact only — subroutes have their own nav items
      match = path === '/principal'
    } else if (href === '/desk') {
      match =
        path === '/desk' ||
        path.startsWith('/desk/') ||
        path === '/admin/emails' ||
        path.startsWith('/admin/emails/')
    } else {
      match = path === href || path.startsWith(href + '/')
    }
    if (!match) continue
    if (!best || href.length > best.length) best = href
  }

  return best
}

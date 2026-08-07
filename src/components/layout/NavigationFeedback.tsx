'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

const FALLBACK_LABEL = 'next view'

function navigationLabel(anchor: HTMLAnchorElement): string {
  return anchor.textContent?.replace(/\s+/g, ' ').trim() || FALLBACK_LABEL
}

export function NavigationFeedback() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentHref = `${pathname}${searchParams.size ? `?${searchParams.toString()}` : ''}`
  const [pending, setPending] = useState<{ href: string; label: string } | null>(null)

  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | null = null

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const target = event.target
      if (!(target instanceof Element)) return
      const anchor = target.closest('a[href]')
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target === '_blank' || anchor.hasAttribute('download')) return

      const destination = new URL(anchor.href, window.location.href)
      if (destination.origin !== window.location.origin) return
      const current = new URL(window.location.href)
      if (
        destination.pathname === current.pathname &&
        destination.search === current.search
      ) {
        return
      }

      setPending({
        href: `${destination.pathname}${destination.search}`,
        label: navigationLabel(anchor),
      })
      if (resetTimer) clearTimeout(resetTimer)
      resetTimer = setTimeout(() => setPending(null), 10_000)
    }

    document.addEventListener('click', onClick, true)
    return () => {
      document.removeEventListener('click', onClick, true)
      if (resetTimer) clearTimeout(resetTimer)
    }
  }, [])

  if (!pending || pending.href === currentHref) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[100] flex h-1 overflow-hidden bg-primary/20"
    >
      <span className="h-full w-2/3 animate-pulse rounded-r-full bg-primary" />
      <span className="sr-only">Opening {pending.label}…</span>
    </div>
  )
}

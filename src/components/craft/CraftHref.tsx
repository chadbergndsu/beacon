import type { ReactNode } from 'react'
import Link from 'next/link'
import { isExternalCraftUrl } from '@/lib/beaconcraft-url'

export function CraftHref({
  href,
  className,
  children,
  onClick,
}: {
  href: string
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  if (isExternalCraftUrl(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={onClick}>
        {children}
      </a>
    )
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  )
}

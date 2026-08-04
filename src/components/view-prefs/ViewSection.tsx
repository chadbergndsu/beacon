'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const VIEW_SECTION_MARKER = 'beacon.ViewSection' as const

/**
 * Marker component — ConfigurableView reads id/title/locked from props
 * and reorders / shows-hides these sections per user.
 */
export function ViewSection({
  id,
  title,
  description,
  locked,
  className,
  children,
}: {
  id: string
  title: string
  description?: string
  locked?: boolean
  className?: string
  children: ReactNode
}) {
  // Keep id/title/locked on the element for editor chrome + type detection
  return (
    <div
      className={cn(className)}
      data-view-section-id={id}
      data-view-section-title={title}
      data-view-section-locked={locked ? '1' : undefined}
      data-view-section-description={description}
    >
      {children}
    </div>
  )
}

ViewSection.displayName = 'ViewSection'
;(ViewSection as unknown as { __beaconViewSection: string }).__beaconViewSection =
  VIEW_SECTION_MARKER

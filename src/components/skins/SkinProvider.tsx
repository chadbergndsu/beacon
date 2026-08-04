'use client'

import { useEffect } from 'react'
import {
  DEFAULT_SKIN,
  SKIN_STORAGE_KEY,
  parseSkinId,
  type SkinId,
} from '@/lib/skins/catalog'

/** Applies data-skin on <html> and keeps localStorage in sync. */
export function SkinProvider({
  initialSkin,
  children,
}: {
  initialSkin: SkinId
  children: React.ReactNode
}) {
  useEffect(() => {
    const skin = parseSkinId(initialSkin || DEFAULT_SKIN)
    document.documentElement.setAttribute('data-skin', skin)
    try {
      localStorage.setItem(SKIN_STORAGE_KEY, skin)
    } catch {
      // private mode
    }
  }, [initialSkin])

  return <>{children}</>
}

/** Instant client pick before server round-trip finishes. */
export function applySkinClient(skinId: SkinId) {
  document.documentElement.setAttribute('data-skin', skinId)
  try {
    localStorage.setItem(SKIN_STORAGE_KEY, skinId)
  } catch {
    // ignore
  }
}
